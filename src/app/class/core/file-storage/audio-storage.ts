import { EventSystem } from '@axe/class/core/system';
import { ResettableTimeout } from '@axe/class/core/system/util/resettable-timeout';

import { AudioFile, AudioFileContext, AudioState } from './audio-file';

export type CatalogItem = {
  readonly identifier: string;
  readonly state: number;
};

export class AudioStorage {
  private static _instance: AudioStorage;
  static get instance(): AudioStorage {
    if (!AudioStorage._instance) AudioStorage._instance = new AudioStorage();
    return AudioStorage._instance;
  }

  private lazyTimer!: ResettableTimeout;
  private hash: { [identifier: string]: AudioFile } = {};

  get audios(): AudioFile[] {
    const audios: AudioFile[] = [];
    for (const identifier in this.hash) {
      audios.push(this.hash[identifier]);
    }
    return audios;
  }

  private constructor() {}

  private destroy() {
    for (const identifier in this.hash) {
      this.delete(identifier);
    }
  }

  async addAsync(file: File): Promise<AudioFile>;
  async addAsync(blob: Blob): Promise<AudioFile>;
  async addAsync(arg: File | Blob): Promise<AudioFile> {
    const audio: AudioFile = await AudioFile.createAsync(arg);

    return this._add(audio);
  }

  add(url: string): AudioFile;
  add(audio: AudioFile): AudioFile;
  add(context: AudioFileContext): AudioFile;
  add(arg: string | AudioFile | AudioFileContext): AudioFile {
    let audio: AudioFile;
    if (typeof arg === 'string') {
      audio = AudioFile.create(arg);
    } else if (arg instanceof AudioFile) {
      audio = arg;
    } else {
      if (this.update(arg)) return this.hash[arg.identifier];
      audio = AudioFile.create(arg);
    }
    return this._add(audio);
  }

  private _add(audio: AudioFile): AudioFile {
    if (AudioState.COMPLETE <= audio.state) this.lazySynchronize(100);
    if (this.update(audio)) return this.hash[audio.identifier];
    this.hash[audio.identifier] = audio;
    return audio;
  }

  private update(audio: AudioFile): boolean;
  private update(audio: AudioFileContext): boolean;
  private update(audio: AudioFile | AudioFileContext): boolean {
    const updateAudio: AudioFile = this.hash[audio.identifier];
    if (updateAudio) {
      updateAudio.apply(audio instanceof AudioFile ? audio.toContext() : audio);
      return true;
    }
    return false;
  }

  delete(identifier: string): boolean {
    const audio: AudioFile = this.hash[identifier];
    if (audio) {
      audio.destroy();
      delete this.hash[identifier];
      return true;
    }
    return false;
  }

  get(identifier: string): AudioFile {
    const audio: AudioFile = this.hash[identifier];
    if (audio) return audio;
    return null!;
  }

  synchronize(peer?: string) {
    if (this.lazyTimer) this.lazyTimer.stop();
    EventSystem.call('SYNCHRONIZE_AUDIO_LIST', this.getCatalog(), peer);
  }

  lazySynchronize(ms: number, peer?: string) {
    if (this.lazyTimer == null) this.lazyTimer = new ResettableTimeout(() => this.synchronize(peer), ms);
    this.lazyTimer.reset(ms);
  }

  getCatalog(): CatalogItem[] {
    const catalog: CatalogItem[] = [];
    for (const audio of AudioStorage.instance.audios) {
      if (AudioState.COMPLETE <= audio.state) {
        catalog.push({ identifier: audio.identifier, state: audio.state });
      }
    }
    return catalog;
  }
}
