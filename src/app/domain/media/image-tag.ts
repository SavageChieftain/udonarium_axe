//本家 PR#92より
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectStore } from '@axe/core/sync/object-store';

@SyncObject('image-tag')
export class ImageTag extends ObjectNode {
  @SyncVar() imageIdentifier: string = '';
  @SyncVar() tag: string = '';

  containsWords(words: string[]): boolean {
    return words.every((word) => this.tag.includes(word));
  }

  static searchImages(searchWords: string[]): ImageFile[] {
    return ObjectStore.instance
      .getObjects<ImageTag>(ImageTag)
      .filter((tag) => tag.containsWords(searchWords))
      .map((tag) => ImageStorage.instance.get(tag.imageIdentifier))
      .filter((image): image is ImageFile => image !== null);
  }

  static get(imageIdentifier: string): ImageTag {
    return ObjectStore.instance.get<ImageTag>(`imagetag_${imageIdentifier}`)!;
  }

  static create(imageIdentifier: string) {
    const object: ImageTag = new ImageTag(`imagetag_${imageIdentifier}`);

    object.imageIdentifier = imageIdentifier;

    object.initialize();
    return object;
  }

  override parseInnerXml(_element: Element) {
    let imageTag = ImageTag.get(this.imageIdentifier);
    if (!imageTag) imageTag = ImageTag.create(this.imageIdentifier);
    const context = imageTag.toContext();
    context.syncData = this.toContext().syncData;
    imageTag.apply(context);
    imageTag.update();
    this.destroy();
  }
} //
