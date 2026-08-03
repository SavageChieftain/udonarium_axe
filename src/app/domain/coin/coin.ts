import { ImageFile } from '@axe/core/storage/image-file';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { DataElement } from '@axe/domain/data/data-element';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { moveToTopmost } from '@axe/domain/tabletop/tabletop-object-util';

export type CoinFace = 'front' | 'back';

export const COIN_FACES: readonly CoinFace[] = ['front', 'back'];

@SyncObject('coin')
export class Coin extends TabletopObject {
  @SyncVar() isLock: boolean = false;
  @SyncVar() face: CoinFace = 'front';
  @SyncVar() rotate: number = 0;
  @SyncVar() zindex: number = 0;

  get size(): number {
    return this.getCommonValue('size', 1);
  }
  set size(size: number) {
    this.setCommonValue('size', size);
  }

  get frontImage(): ImageFile | null {
    return this.getImageFile('front');
  }
  get backImage(): ImageFile | null {
    return this.getImageFile('back');
  }

  override get imageFile(): ImageFile {
    return (this.face === 'front' ? this.frontImage : this.backImage) ?? ImageFile.Empty;
  }

  get isFront(): boolean {
    return this.face === 'front';
  }

  flip(random: () => number = Math.random): CoinFace {
    this.face = random() < 0.5 ? 'front' : 'back';
    return this.face;
  }

  toTopmost() {
    moveToTopmost(this, ['coin']);
  }

  static create(name: string, size: number = 1, identifier?: string): Coin {
    const object: Coin = identifier ? new Coin(identifier) : new Coin();

    object.createDataElements();
    object.commonDataElement!.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement!.appendChild(DataElement.create('size', size, {}, `size_${object.identifier}`));
    object.imageDataElement!.appendChild(
      DataElement.create('front', '', { type: 'image' }, `front_${object.identifier}`)
    );
    object.imageDataElement!.appendChild(
      DataElement.create('back', '', { type: 'image' }, `back_${object.identifier}`)
    );
    object.initialize();

    return object;
  }
}
