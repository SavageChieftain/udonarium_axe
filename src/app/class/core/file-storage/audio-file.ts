import { FileReaderUtil } from '@axe/core/file-storage/file-reader-util';

export enum AudioState {
  NULL = 0,
  COMPLETE = 1,
  URL = 1000,
}

export interface AudioFileContext {
  identifier: string;
  name: string;
  type: string;
  blob: Blob | null;
  url: string;
}

export class AudioFile {
  private context: AudioFileContext = {
    identifier: '',
    name: '',
    blob: null,
    type: '',
    url: '',
  };

  get identifier(): string {
    return this.context.identifier;
  }
  get name(): string {
    return this.context.name;
  }
  get blob(): Blob | null {
    return this.context.blob;
  }
  get url(): string {
    return this.context.url;
  }
  get isReady(): boolean {
    return this.state !== AudioState.NULL;
  }
  get state(): AudioState {
    if (!this.url && !this.blob) return AudioState.NULL;
    if (this.url && !this.blob) return AudioState.URL;
    return AudioState.COMPLETE;
  }

  isHidden: boolean = false;

  private constructor() {}

  static createEmpty(identifier: string): AudioFile {
    const audio = new AudioFile();
    audio.context.identifier = identifier;

    return audio;
  }

  static create(arg: string | AudioFileContext): AudioFile {
    const audio = new AudioFile();
    if (typeof arg === 'string') {
      audio.context.identifier = arg;
      audio.context.name = arg;
      audio.context.url = arg;
    } else {
      audio.apply(arg);
    }
    return audio;
  }

  static async createAsync(blob: Blob): Promise<AudioFile> {
    if (blob instanceof File) {
      return await AudioFile._createAsync(blob, blob.name);
    }
    return await AudioFile._createAsync(blob);
  }

  private static async _createAsync(blob: Blob, name?: string): Promise<AudioFile> {
    const arrayBuffer = await FileReaderUtil.readAsArrayBufferAsync(blob);

    const audio = new AudioFile();
    audio.context.identifier = await FileReaderUtil.calcSHA256Async(arrayBuffer);
    audio.context.blob = new Blob([arrayBuffer], { type: blob.type });
    audio.context.type = audio.context.blob.type;
    audio.context.url = window.URL.createObjectURL(audio.context.blob);
    audio.context.name = name || audio.context.identifier;

    return audio;
  }

  destroy() {
    this.revokeURLs();
  }

  apply(context: AudioFileContext) {
    this.context.identifier ||= context.identifier;
    if (context.name) this.context.name = context.name;
    this.context.blob ??= context.blob;
    this.context.type ||= context.type;
    this.context.url ||= context.url;
    this.createURLs();
  }

  private createURLs() {
    if (this.context.blob && !this.context.url) this.context.url = window.URL.createObjectURL(this.context.blob);
  }

  private revokeURLs() {
    if (!this.context.blob) return;
    window.URL.revokeObjectURL(this.context.url);
  }

  toContext(): AudioFileContext {
    return {
      identifier: this.context.identifier,
      name: this.context.name,
      blob: this.context.blob,
      type: this.context.type,
      url: this.context.url,
    };
  }
}
