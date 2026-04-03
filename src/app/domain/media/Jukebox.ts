import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { updateAudioResource$ } from '@axe/domain/domain-events';
import { Config } from '@axe/domain/peer/config';

@SyncObject('jukebox')
export class Jukebox extends GameObject {
  @SyncVar() audioIdentifier: string = '';
  @SyncVar() startTime: number = 0;
  @SyncVar() isLoop: boolean = false;
  @SyncVar() isPlaying: boolean = false;

  get audio(): AudioFile | null {
    return AudioStorage.instance.get(this.audioIdentifier);
  }

  private audioPlayer: AudioPlayer = new AudioPlayer();
  private audioUpdateCleanup: (() => void) | null = null;

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
  }

  play(identifier: string, isLoop: boolean = false) {
    const audio = AudioStorage.instance.get(identifier);
    if (!audio || !audio.isReady) return;
    this.audioIdentifier = identifier;
    this.isPlaying = true;
    this.isLoop = isLoop;
    this._play();
  }

  private _play() {
    this._stop();
    if (!this.audio || !this.audio.isReady) {
      this.playAfterFileUpdate();
      return;
    }
    this.audioPlayer.loop = true;
    this.audioPlayer.play(this.audio);
  }

  stop() {
    this.audioIdentifier = '';
    this.isPlaying = false;
    this._stop();
  }

  private _stop() {
    this.unregisterEvent();
    this.audioPlayer.stop();
  }

  private playAfterFileUpdate() {
    this.audioUpdateCleanup = updateAudioResource$.subscribe(() => {
      this._play();
    });
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
    super.apply(context);
    if ((audioIdentifier !== this.audioIdentifier || !isPlaying) && this.isPlaying) {
      this._play();
    } else if (isPlaying !== this.isPlaying && !this.isPlaying) {
      this._stop();
    }
  }
}
