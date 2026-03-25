import { networkSend } from '@axe/core/network/network-messaging';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';

import { ImageContext, ImageFile, ImageState } from './image-file';

export type CatalogItem = {
  readonly identifier: string;
  readonly state: number;
};

export class ImageStorage {
  private static _instance: ImageStorage;
  static get instance(): ImageStorage {
    if (!ImageStorage._instance) ImageStorage._instance = new ImageStorage();
    return ImageStorage._instance;
  }

  private imageHash: { [identifier: string]: ImageFile } = {};

  get images(): ImageFile[] {
    const images: ImageFile[] = [];
    for (const identifier in this.imageHash) {
      images.push(this.imageHash[identifier]);
    }
    return images;
  }

  private lazyTimer!: ResettableTimeout;

  private constructor() {}

  private destroy() {
    for (const identifier in this.imageHash) {
      this.delete(identifier);
    }
  }

  async addAsync(file: File): Promise<ImageFile>;
  async addAsync(blob: Blob): Promise<ImageFile>;
  async addAsync(arg: File | Blob): Promise<ImageFile> {
    const image: ImageFile = await ImageFile.createAsync(arg);

    return this._add(image);
  }

  add(url: string): ImageFile;
  add(image: ImageFile): ImageFile;
  add(context: ImageContext): ImageFile;
  add(arg: string | ImageFile | ImageContext): ImageFile {
    let image: ImageFile;
    if (typeof arg === 'string') {
      image = ImageFile.create(arg);
    } else if (arg instanceof ImageFile) {
      image = arg;
    } else {
      if (this.update(arg)) return this.imageHash[arg.identifier];
      image = ImageFile.create(arg);
    }
    return this._add(image);
  }

  private _add(image: ImageFile): ImageFile {
    if (ImageState.COMPLETE <= image.state) this.lazySynchronize(100);
    if (this.update(image)) return this.imageHash[image.identifier];
    this.imageHash[image.identifier] = image;
    return image;
  }

  private update(image: ImageFile): boolean;
  private update(image: ImageContext): boolean;
  private update(image: ImageFile | ImageContext): boolean {
    const updatingImage: ImageFile = this.imageHash[image.identifier];
    if (updatingImage) {
      updatingImage.apply(image instanceof ImageFile ? image.toContext() : image);
      return true;
    }
    return false;
  }

  delete(identifier: string): boolean {
    const deleteImage: ImageFile = this.imageHash[identifier];
    if (deleteImage) {
      deleteImage.destroy();
      delete this.imageHash[identifier];
      return true;
    }
    return false;
  }

  get(identifier: string): ImageFile {
    const image: ImageFile = this.imageHash[identifier];
    if (image) return image;
    return null!;
  }

  synchronize(peer?: string) {
    if (this.lazyTimer) this.lazyTimer.stop();
    const catalog = this.getCatalog();
    networkSend('SYNCHRONIZE_FILE_LIST', catalog, peer);
  }

  lazySynchronize(ms: number, peer?: string) {
    if (this.lazyTimer == null) this.lazyTimer = new ResettableTimeout(() => this.synchronize(peer), ms);
    this.lazyTimer.reset(ms);
  }

  getCatalog(): CatalogItem[] {
    const catalog: CatalogItem[] = [];
    for (const image of this.images) {
      if (ImageState.COMPLETE <= image.state) {
        catalog.push({ identifier: image.identifier, state: image.state });
      }
    }
    return catalog;
  }
}
