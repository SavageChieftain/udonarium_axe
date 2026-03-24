//entyu_2 #92
import { ImageFile } from '@axe/core/storage/image-file';
import { SyncObject } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { InnerXml } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';

import { ImageTag } from './image-tag';

@SyncObject('image-tag-list')
export class ImageTagList extends ObjectNode implements InnerXml {
  private identifiers: string[] = [];

  // GameObject Lifecycle
  onStoreAdded() {
    super.onStoreAdded();
    ObjectStore.instance.remove(this); // ObjectStoreには登録しない
  }

  innerXml(): string {
    return Array.from(new Set(this.identifiers))
      .map((identifier) => ImageTag.get(identifier))
      .filter((imageTag) => imageTag)
      .map((imageTag) => imageTag.toXml())
      .join('');
  }

  static create(images: ImageFile[]): ImageTagList {
    const imageTagList = new ImageTagList();

    imageTagList.identifiers = images.map((image) => image.identifier);

    return imageTagList;
  }
}
//
