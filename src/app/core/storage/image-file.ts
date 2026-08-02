import * as FileReaderUtil from '@axe/core/storage/file-reader-util';
import { convertBlobToWebP } from '@axe/core/storage/image-downscale';
import { createThumbnailInWorker } from '@axe/core/storage/image-thumbnail';

const THUMBNAIL_MAX_SIZE = 128;

export enum ImageState {
  NULL = 0,
  THUMBNAIL = 1,
  COMPLETE = 2,
  URL = 1000,
}

export interface ImageContext {
  identifier: string;
  name: string;
  type: string;
  blob: Blob | null;
  url: string;
  thumbnail: ThumbnailContext;
}

export interface ThumbnailContext {
  type: string;
  blob: Blob | null;
  url: string;
}

export class ImageFile {
  context: ImageContext = {
    identifier: '',
    name: '',
    blob: null,
    type: '',
    url: '',
    thumbnail: {
      blob: null,
      type: '',
      url: '',
    },
  };

  get identifier(): string {
    return this.context.identifier;
  }
  get name(): string {
    return this.context.name;
  }
  get blob(): Blob | null {
    return this.context.blob ? this.context.blob : this.context.thumbnail.blob;
  }
  get url(): string {
    return this.context.url ? this.context.url : this.context.thumbnail.url;
  }
  get thumbnail(): ThumbnailContext {
    return this.context.thumbnail;
  }

  get state(): ImageState {
    if (!this.url && !this.blob) return ImageState.NULL;
    if (this.url && !this.blob) return ImageState.URL;
    if (this.blob === this.thumbnail.blob) return ImageState.THUMBNAIL;
    return ImageState.COMPLETE;
  }

  get isEmpty(): boolean {
    return this.state <= ImageState.NULL;
  }

  private constructor() {}

  static createEmpty(identifier: string): ImageFile {
    const imageFile = new ImageFile();
    imageFile.context.identifier = identifier;

    return imageFile;
  }

  static create(url: string): ImageFile;
  static create(context: ImageContext): ImageFile;
  static create(arg: string | ImageContext): ImageFile {
    if (typeof arg === 'string') {
      const imageFile = new ImageFile();
      imageFile.context.identifier = arg;
      imageFile.context.name = arg;
      imageFile.context.url = arg;
      return imageFile;
    } else {
      const imageFile = new ImageFile();
      imageFile.apply(arg);
      return imageFile;
    }
  }

  static async createAsync(file: File): Promise<ImageFile>;
  static async createAsync(blob: Blob): Promise<ImageFile>;
  static async createAsync(arg: File | Blob): Promise<ImageFile> {
    if (arg instanceof File) {
      return await ImageFile._createAsync(arg, arg.name);
    } else if (arg instanceof Blob) {
      return await ImageFile._createAsync(arg);
    }
    return await ImageFile._createAsync(arg);
  }

  private static readonly SAVE_DATA_FILENAME_RE = /^([0-9a-f]{64})\./;

  private static async _createAsync(blob: Blob, name?: string): Promise<ImageFile> {
    const preservedId = name ? (ImageFile.SAVE_DATA_FILENAME_RE.exec(name)?.[1] ?? null) : null;

    const imageFile = new ImageFile();
    if (preservedId) {
      imageFile.context.identifier = preservedId;
      imageFile.context.blob = blob;
    } else {
      const converted = await convertBlobToWebP(blob);
      const arrayBuffer = await FileReaderUtil.readAsArrayBufferAsync(converted);
      imageFile.context.identifier = await FileReaderUtil.calcSHA256Async(arrayBuffer);
      imageFile.context.blob = new Blob([arrayBuffer], { type: converted.type });
    }
    imageFile.context.name = name ?? '';
    imageFile.context.url = window.URL.createObjectURL(imageFile.context.blob);

    imageFile.context.thumbnail = await ImageFile.createThumbnailAsync(imageFile.context);

    if (imageFile.context.name == null) imageFile.context.name = imageFile.context.identifier;

    return imageFile;
  }

  destroy() {
    this.revokeURLs();
  }

  apply(context: ImageContext) {
    if (!this.context.identifier && context.identifier) this.context.identifier = context.identifier;
    if (!this.context.name && context.name) this.context.name = context.name;
    if (!this.context.blob && context.blob) this.context.blob = context.blob;
    if (!this.context.type && context.type) this.context.type = context.type;
    if (!this.context.url && context.url) {
      if (this.state !== ImageState.URL) window.URL.revokeObjectURL(this.context.url);
      this.context.url = context.url;
    }
    if (!this.context.thumbnail.blob && context.thumbnail.blob) this.context.thumbnail.blob = context.thumbnail.blob;
    if (!this.context.thumbnail.type && context.thumbnail.type) this.context.thumbnail.type = context.thumbnail.type;
    if (!this.context.thumbnail.url && context.thumbnail.url) {
      if (this.state !== ImageState.URL) window.URL.revokeObjectURL(this.context.thumbnail.url);
      this.context.thumbnail.url = context.thumbnail.url;
    }
    this.createURLs();
  }

  toContext(): ImageContext {
    return {
      identifier: this.context.identifier,
      name: this.context.name,
      blob: this.context.blob,
      type: this.context.type,
      url: this.context.url,
      thumbnail: {
        blob: this.context.thumbnail.blob,
        type: this.context.thumbnail.type,
        url: this.context.thumbnail.url,
      },
    };
  }

  private createURLs() {
    if (this.state === ImageState.URL) return;
    if (this.context.blob && this.context.url === '') this.context.url = window.URL.createObjectURL(this.context.blob);
    if (this.context.thumbnail.blob && this.context.thumbnail.url === '')
      this.context.thumbnail.url = window.URL.createObjectURL(this.context.thumbnail.blob);
  }

  private revokeURLs() {
    if (this.state === ImageState.URL) return;
    window.URL.revokeObjectURL(this.context.url);
    window.URL.revokeObjectURL(this.context.thumbnail.url);
  }

  private static async createThumbnailAsync(context: ImageContext): Promise<ThumbnailContext> {
    const type = context.blob?.type ?? '';
    const fromWorker = context.blob ? await createThumbnailInWorker(context.blob, type, THUMBNAIL_MAX_SIZE) : null;
    if (fromWorker) {
      return { type: fromWorker.type, blob: fromWorker, url: window.URL.createObjectURL(fromWorker) };
    }
    return ImageFile.createThumbnailOnMainThread(context);
  }

  private static createThumbnailOnMainThread(context: ImageContext): Promise<ThumbnailContext> {
    return new Promise((resolve, reject) => {
      const image: HTMLImageElement = new Image();
      image.onload = () => {
        const scale: number = Math.min(THUMBNAIL_MAX_SIZE / Math.max(image.width, image.height), 1.0);
        const dstWidth = image.width * scale;
        const dstHeight = image.height * scale;

        const canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.width = dstWidth;
        canvas.height = dstHeight;
        const render: CanvasRenderingContext2D = canvas.getContext('2d')!;
        render.drawImage(image, 0, 0, dstWidth, dstHeight);

        canvas.toBlob((blob) => {
          const thumbnail: ThumbnailContext = {
            type: blob!.type,
            blob: blob,
            url: window.URL.createObjectURL(blob!),
          };
          resolve(thumbnail);
        }, context.blob!.type);
      };
      image.onabort = image.onerror = () => {
        reject();
      };
      image.src = context.url;
    });
  }

  static Empty: ImageFile = ImageFile.createEmpty('null');
}

// ImageFile is mutable; the url string changes on thumbnail → full transition while
// the instance stays the same. Snapshot the url to detect that change.
export function imageFileEqual(): (a: ImageFile, b: ImageFile) => boolean {
  let lastUrl: string | null = null;
  return (_a, b) => {
    const url = b.url;
    const same = url === lastUrl;
    lastUrl = url;
    return same;
  };
}
