import { extractArtworkUrl } from '@axe/core/storage/audio-id3';
import * as FileReaderUtil from '@axe/core/storage/file-reader-util';

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

  /** ObjectURL for embedded album artwork (null if none, undefined if not yet extracted) */
  private _artworkUrl: string | null | undefined = undefined;
  get artworkUrl(): string | null {
    return this._artworkUrl ?? null;
  }

  private constructor() {}

  static createEmpty(identifier: string, name?: string): AudioFile {
    const audio = new AudioFile();
    audio.context.identifier = identifier;
    if (name) audio.context.name = name;

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
    const name = blob instanceof File ? blob.name : undefined;
    const arrayBuffer = await FileReaderUtil.readAsArrayBufferAsync(blob);

    const audio = new AudioFile();
    audio.context.identifier = await FileReaderUtil.calcSHA256Async(arrayBuffer);
    audio.context.blob = new Blob([arrayBuffer], { type: blob.type });
    audio.context.type = audio.context.blob.type;
    audio.context.url = window.URL.createObjectURL(audio.context.blob);
    audio.context.name = name ?? audio.context.identifier;
    audio._artworkUrl = extractArtworkUrl(arrayBuffer);

    return audio;
  }

  destroy() {
    this.revokeURLs();
    if (this._artworkUrl) URL.revokeObjectURL(this._artworkUrl);
  }

  apply(context: AudioFileContext) {
    this.context.identifier ||= context.identifier;
    if (context.name) this.context.name = context.name;
    const hadBlob = !!this.context.blob;
    this.context.blob ??= context.blob;
    this.context.type ||= context.type;
    this.context.url ||= context.url;
    this.createURLs();
    // Extract artwork when blob first arrives (P2P receive path)
    if (!hadBlob && this.context.blob && this._artworkUrl === undefined) {
      this._artworkUrl = null; // prevent double extraction
      FileReaderUtil.readAsArrayBufferAsync(this.context.blob).then((buf) => {
        this._artworkUrl = extractArtworkUrl(buf);
      });
    }
  }

  private createURLs() {
    if (this.context.blob && !this.context.url) this.context.url = window.URL.createObjectURL(this.context.blob);
  }

  private revokeURLs() {
    if (!this.context.blob) return;
    window.URL.revokeObjectURL(this.context.url);
  }

  toContext(): AudioFileContext {
    return { ...this.context };
  }
}
