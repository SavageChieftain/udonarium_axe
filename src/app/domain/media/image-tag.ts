import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectStore } from '@axe/core/sync/object-store';

/**
 * The tag on a picture the tool brought with it rather than a person: dice faces, the
 * pictures the sample cut-ins are built from. Tagged this way it stays out of the media
 * library, where it would only be in the way of what a person put there.
 *
 * It is a stored value, shared between everyone in a room, so it is this word and not the
 * word for it in whatever language the screen happens to be in.
 */
export const SYSTEM_RESERVED_TAG = 'システム予約';

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
