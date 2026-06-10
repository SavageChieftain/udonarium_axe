import { updateAudioResource$ } from '@axe/core/event/domain-events';
import { onFirstUserInteraction } from '@axe/core/input/user-interaction-unlock';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { Playlist } from '@axe/domain/media/playlist';
import { Config } from '@axe/domain/peer/config';

export type RepeatMode = 'none' | 'all' | 'one';

@SyncObject('jukebox')
export class Jukebox extends GameObject {
  @SyncVar() audioIdentifier: string = '';
  @SyncVar() startTime: number = 0;
  @SyncVar() repeatMode: RepeatMode = 'one';
  @SyncVar() isPlaying: boolean = false;
  @SyncVar() isSeekLocked: boolean = true;
  @SyncVar() seIdentifier: string = '';
  @SyncVar() seTrigger: number = 0;
  @SyncVar() seStopIdentifier: string = '';
  @SyncVar() seStopTrigger: number = 0;

  get audio(): AudioFile | null {
    return AudioStorage.instance.get(this.audioIdentifier);
  }

  private audioPlayer: AudioPlayer = new AudioPlayer();
  private fadingPlayer: AudioPlayer | null = null;
  private audioUpdateCleanup: (() => void) | null = null;
  private isInitialSync = true;
  private static readonly CROSSFADE_MS = 600;
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

  override onStoreAdded() {
    super.onStoreAdded();
    this.unlockAfterUserInteraction();
  }

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
    if (AudioTag.get(identifier)?.tag === 'SE') {
      this.seIdentifier = identifier;
      this.seTrigger = this.seTrigger + 1;
      this.playSE(audio);
      return;
    }
    this.audioIdentifier = identifier;
    this.isPlaying = true;
    this._play();
  }

  private playSE(audio: AudioFile) {
    AudioPlayer.playSE(audio);
  }

  stopSE(identifier: string) {
    this.seStopIdentifier = identifier;
    this.seStopTrigger = this.seStopTrigger + 1;
    AudioPlayer.stopSE(identifier);
  }

  isSePlaying(identifier: string): boolean {
    return AudioPlayer.isSePlaying(identifier);
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

  private crossfadeSeek(time: number, fadeMs: number = Jukebox.CROSSFADE_MS) {
    if (!this.audio || !this.audio.isReady) {
      this.audioPlayer.seekTo(time);
      return;
    }
    if (this.fadingPlayer) {
      this.fadingPlayer.stop();
      this.fadingPlayer = null;
    }
    const fading = this.audioPlayer;
    fading.onEnded = null;
    this.fadingPlayer = fading;

    const isSE = AudioTag.get(this.audioIdentifier)?.tag === 'SE';
    const newPlayer = new AudioPlayer();
    newPlayer.volumeType = isSE ? VolumeType.SE : VolumeType.MASTER;
    newPlayer.loop = !isSE && this.repeatMode === 'one';
    newPlayer.onEnded = isSE ? null : () => this.onTrackNaturallyEnded();
    newPlayer.volume = 0;
    newPlayer.play(this.audio);
    newPlayer.seekTo(time);
    this.audioPlayer = newPlayer;

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
    onFirstUserInteraction(() => {
      this.audioPlayer.stop();
      if (this.isPlaying) this._play();
    });
  }

  private unregisterEvent() {
    this.audioUpdateCleanup?.();
    this.audioUpdateCleanup = null;
  }

  override apply(context: ObjectContext) {
    const audioIdentifier = this.audioIdentifier;
    const isPlaying = this.isPlaying;
    const startTime = this.startTime;
    const seTrigger = this.seTrigger;
    const seStopTrigger = this.seStopTrigger;
    super.apply(context);
    if (this.isInitialSync) {
      this.isInitialSync = false;
      if (this.isPlaying) this._play();
      return;
    }
    if (this.seTrigger !== seTrigger && this.seIdentifier) {
      const seAudio = AudioStorage.instance.get(this.seIdentifier);
      if (seAudio?.isReady) this.playSE(seAudio);
    }
    if (this.seStopTrigger !== seStopTrigger && this.seStopIdentifier) {
      AudioPlayer.stopSE(this.seStopIdentifier);
    }
    if ((audioIdentifier !== this.audioIdentifier || !isPlaying) && this.isPlaying) {
      this._play();
    } else if (isPlaying !== this.isPlaying && !this.isPlaying) {
      this._stop();
    } else if (startTime !== this.startTime && this.isPlaying) {
      const driftMs = Math.abs((this.audioPlayer.currentTime - this.startTime) * 1000);
      if (driftMs < Jukebox.SYNC_SEEK_THRESHOLD_MS) return;
      this.crossfadeSeek(this.startTime);
    }
  }
}
