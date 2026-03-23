import { inject, Injectable } from '@angular/core';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ImageStorage } from '@axe/class/core/file-storage/image-storage';

const skeletonImage: ImageFile = ImageFile.create('./assets/images/skeleton.png');

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  private imageStorage = inject(ImageStorage);

  constructor() {}

  getSkeletonOr(image: ImageFile): ImageFile;
  getSkeletonOr(imageIdentifier: string): ImageFile;
  getSkeletonOr(arg: ImageFile | string): ImageFile {
    const image: ImageFile = arg instanceof ImageFile ? arg : this.imageStorage.get(arg);
    return image && !image.isEmpty ? image : skeletonImage;
  }

  getEmptyOr(image: ImageFile): ImageFile;
  getEmptyOr(imageIdentifier: string): ImageFile;
  getEmptyOr(arg: ImageFile | string): ImageFile {
    const image: ImageFile = arg instanceof ImageFile ? arg : this.imageStorage.get(arg);
    return image && !image.isEmpty ? image : ImageFile.Empty;
  }
}
