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
  /** Kept from everyone but the game master, who chose to keep it. */
  @SyncVar() isSecret: boolean = false;

  containsWords(words: string[]): boolean {
    return words.every((word) => this.tag.includes(word));
  }

  /** `canSeeSecret` says whether what the master is keeping back may be among the answers. */
  static searchImages(searchWords: string[], canSeeSecret = false): ImageFile[] {
    return ObjectStore.instance
      .getObjects<ImageTag>(ImageTag)
      .filter((tag) => tag.containsWords(searchWords) && canBrowseImage(tag, canSeeSecret))
      .map((tag) => ImageStorage.instance.get(tag.imageIdentifier))
      .filter((image): image is ImageFile => image !== null);
  }

  static get(imageIdentifier: string): ImageTag {
    return ObjectStore.instance.get<ImageTag>(`imagetag_${imageIdentifier}`)!;
  }

  static isSecret(imageIdentifier: string): boolean {
    return ImageTag.get(imageIdentifier)?.isSecret === true;
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

/**
 * Whether a picture belongs in a list of pictures to pick from.
 *
 * Two kinds are held back. What the tool brought with it is not the room's to reuse or to
 * throw away. What the game master has kept is not the players' to come across: it stays
 * out of their lists, and out of the master's own while the master has folded them away.
 *
 * Nothing here hides a picture already standing on the table. A picture kept back is kept
 * back from the choosing, not from the board — put a face on a piece and everyone sees the
 * piece, whatever this says.
 */
export function canBrowseImage(tag: ImageTag | null, canSeeSecret: boolean, showSecret = true): boolean {
  if (!tag) return true;
  if (tag.tag === SYSTEM_RESERVED_TAG) return false;
  if (tag.isSecret) return canSeeSecret && showSecret;
  return true;
}
