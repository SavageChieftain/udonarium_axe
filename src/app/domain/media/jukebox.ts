import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { updateAudioResource$ } from '@axe/domain/domain-events';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { Playlist } from '@axe/domain/media/playlist';
import { Config } from '@axe/domain/peer/config';

export type RepeatMode = 'none' | 'all' | 'one';

@SyncObject('jukebox')
export class Jukebox extends GameObject {
  @SyncVar() audioIdentifier: string = '';
  @SyncVar() startTime: number = 0;
  @SyncVar() repeatMode: RepeatMode = 'none';
  @SyncVar() isPlaying: boolean = false;

  get audio(): AudioFile | null {
    return AudioStorage.instance.get(this.audioIdentifier);
  }

  private audioPlayer: AudioPlayer = new AudioPlayer();
  private fadingPlayer: AudioPlayer | null = null;
  private audioUpdateCleanup: (() => void) | null = null;
  private isInitialSync = true;
  /** sync 経由の seek でクロスフェードする秒数 (UI シークは即時) */
  private static readonly CROSSFADE_MS = 600;
  /** ms 単位の許容ずれ。これ未満は再生バラつきとして無視する */
  private static readonly SYNC_SEEK_THRESHOLD_MS = 250;

  get config(): Config {
    return ObjectStore.instance.get<Config>('Config')!;
  }

  private _volume = 0.5;
  get volume(): number {
    return this._volume;
  }
  set volume(volume: number) {
    this._volume = volume;
  }

  private _auditionVolume = 0.5;
  get auditionVolume() {
    return this._auditionVolume;
  }
  set auditionVolume(_auditionVolume: number) {
    this._auditionVolume = _auditionVolume;
  }

  private _seVolume = 0.5;
  get seVolume(): number {
    return this._seVolume;
  }
  set seVolume(seVolume: number) {
    this._seVolume = seVolume;
  }

  get currentTime(): number {
    return this.audioPlayer.currentTime;
  }

  get duration(): number {
    return this.audioPlayer.duration;
  }

  cycleRepeatMode(): void {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const next = (modes.indexOf(this.repeatMode) + 1) % modes.length;
    this.repeatMode = modes[next];
    this.audioPlayer.loop = this.repeatMode === 'one';
  }

  // GameObject Lifecycle
  override onStoreAdded() {
    super.onStoreAdded();
    this.unlockAfterUserInteraction();
  }

  // GameObject Lifecycle
  override onStoreRemoved() {
    super.onStoreRemoved();
    this._stop();
  }

  setNewVolume() {
    AudioPlayer.volume = this.volume * this.config.roomVolume;
    AudioPlayer.auditionVolume = this.auditionVolume * this.config.roomVolume;
    AudioPlayer.seVolume = this.seVolume * this.config.roomVolume;
  }

  play(identifier: string, _isLoop: boolean = false) {
    const audio = AudioStorage.instance.get(identifier);
    if (!audio || !audio.isReady) return;
    this.audioIdentifier = identifier;
    this.isPlaying = true;
    this._play();
  }

  private _play() {
    this._stop();
    if (!this.audio || !this.audio.isReady) {
      this.playAfterFileUpdate();
      return;
    }
    const isSE = AudioTag.get(this.audioIdentifier)?.tag === 'SE';
    this.audioPlayer.volumeType = isSE ? VolumeType.SE : VolumeType.MASTER;
    this.audioPlayer.loop = !isSE && this.repeatMode === 'one';
    this.audioPlayer.onEnded = isSE ? null : () => this.onTrackNaturallyEnded();
    this.audioPlayer.play(this.audio);
  }

  stop() {
    this.audioIdentifier = '';
    this.isPlaying = false;
    this._stop();
  }

  seek(time: number) {
    this.startTime = time;
    this.audioPlayer.seekTo(time);
  }

  private _stop() {
    this.unregisterEvent();
    this.audioPlayer.stop();
    if (this.fadingPlayer) {
      this.fadingPlayer.stop();
      this.fadingPlayer = null;
    }
  }

  /**
   * sync で受け取った位置に滑らかに移動する。
   * 旧プレーヤーをフェードアウト、新プレーヤーを新位置から開始してフェードインする。
   * 音声ファイル未到着時など crossfade できないケースは即時 seek にフォールバックする。
   */
  private crossfadeSeek(time: number, fadeMs: number = Jukebox.CROSSFADE_MS) {
    if (!this.audio || !this.audio.isReady) {
      this.audioPlayer.seekTo(time);
      return;
    }
    // 既存のクロスフェードを片付ける（旧の旧は捨てる）
    if (this.fadingPlayer) {
      this.fadingPlayer.stop();
      this.fadingPlayer = null;
    }
    // 現プレーヤーを fading 役に退避し、onEnded のチェーン暴発を防ぐ
    const fading = this.audioPlayer;
    fading.onEnded = null;
    this.fadingPlayer = fading;

    // 新プレーヤーを新位置から、無音で起動
    const isSE = AudioTag.get(this.audioIdentifier)?.tag === 'SE';
    const newPlayer = new AudioPlayer();
    newPlayer.volumeType = isSE ? VolumeType.SE : VolumeType.MASTER;
    newPlayer.loop = !isSE && this.repeatMode === 'one';
    newPlayer.onEnded = isSE ? null : () => this.onTrackNaturallyEnded();
    newPlayer.volume = 0;
    newPlayer.play(this.audio);
    newPlayer.seekTo(time);
    this.audioPlayer = newPlayer;

    // 旧をフェードアウト → 完了したら停止＆破棄。新は通常音量へフェードイン
    newPlayer.fadeVolumeTo(1, fadeMs);
    fading.fadeVolumeTo(0, fadeMs).then(() => {
      if (this.fadingPlayer === fading) {
        fading.stop();
        this.fadingPlayer = null;
      }
    });
  }

  private playAfterFileUpdate() {
    if (this.audioUpdateCleanup) return;
    this.audioUpdateCleanup = updateAudioResource$.subscribe(() => {
      if (!this.audio || !this.audio.isReady) return;
      this.unregisterEvent();
      const isSE = AudioTag.get(this.audioIdentifier)?.tag === 'SE';
      this.audioPlayer.volumeType = isSE ? VolumeType.SE : VolumeType.MASTER;
      this.audioPlayer.loop = !isSE && this.repeatMode === 'one';
      this.audioPlayer.onEnded = isSE ? null : () => this.onTrackNaturallyEnded();
      this.audioPlayer.play(this.audio);
    });
  }

  private onTrackNaturallyEnded() {
    if (this.repeatMode === 'one') return;
    const nextId = this.getNextTrackId();
    if (nextId) {
      this.audioIdentifier = nextId;
      this._play();
    } else {
      this.stop();
    }
  }

  private getNextTrackId(): string | null {
    const entries = (ObjectStore.instance.get<Playlist>('Playlist') ?? null)?.entries ?? [];
    const list =
      entries.length > 0
        ? entries
        : AudioStorage.instance.audios
            .filter((a) => !a.isHidden && (AudioTag.get(a.identifier)?.tag ?? 'BGM') !== 'SE')
            .map((a) => a.identifier);
    if (!list.length) return null;
    const idx = list.indexOf(this.audioIdentifier);
    const nextIdx = idx === -1 ? 0 : idx + 1;
    if (nextIdx >= list.length) return this.repeatMode === 'all' ? list[0] : null;
    return list[nextIdx];
  }

  private unlockAfterUserInteraction() {
    const callback = () => {
      document.body.removeEventListener('touchstart', callback, true);
      document.body.removeEventListener('mousedown', callback, true);
      this.audioPlayer.stop();
      if (this.isPlaying) this._play();
    };
    document.body.addEventListener('touchstart', callback, true);
    document.body.addEventListener('mousedown', callback, true);
  }

  private unregisterEvent() {
    this.audioUpdateCleanup?.();
    this.audioUpdateCleanup = null;
  }

  override apply(context: ObjectContext) {
    const audioIdentifier = this.audioIdentifier;
    const isPlaying = this.isPlaying;
    const startTime = this.startTime;
    super.apply(context);
    if (this.isInitialSync) {
      this.isInitialSync = false;
      if (this.isPlaying) this._play();
      return;
    }
    if ((audioIdentifier !== this.audioIdentifier || !isPlaying) && this.isPlaying) {
      this._play();
    } else if (isPlaying !== this.isPlaying && !this.isPlaying) {
      this._stop();
    } else if (startTime !== this.startTime && this.isPlaying) {
      // sync 経由の seek: 微小ずれは無視、有意なずれはクロスフェードで滑らかに合わせる
      const driftMs = Math.abs((this.audioPlayer.currentTime - this.startTime) * 1000);
      if (driftMs < Jukebox.SYNC_SEEK_THRESHOLD_MS) return;
      this.crossfadeSeek(this.startTime);
    }
  }
}
