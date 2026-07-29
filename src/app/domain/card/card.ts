import { getPeerContext } from '@axe/core/network/peer-context-source';
import { ImageFile } from '@axe/core/storage/image-file';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { handLocationOf, isHandLocation, isHandOf } from '@axe/domain/card/hand-location';
import { DataElement } from '@axe/domain/data/data-element';
import { OwnedTabletopObject } from '@axe/domain/tabletop/owned-tabletop-object';
import { moveToTopmost } from '@axe/domain/tabletop/tabletop-object-util';

export enum CardState {
  FRONT,
  BACK,
}

@SyncObject('card')
export class Card extends OwnedTabletopObject {
  @SyncVar() isLock: boolean = false;
  @SyncVar() dispLockMark: boolean = true;

  @SyncVar() state: CardState = CardState.FRONT;
  @SyncVar() rotate: number = 0;
  @SyncVar() owner: string = '';
  @SyncVar() zindex: number = 0;
  @SyncVar() handOrder: number = 0;
  @SyncVar() disclosureMode: string = '';
  @SyncVar() disclosureUserIds: string[] = [];

  @SyncVar() overViewWidth: number = 250;
  @SyncVar() overViewMaxHeight: number = 250;

  override get isVisibleOnTable(): boolean {
    return this.location.name === 'table' && (!this.parentIsAssigned || this.parentIsDestroyed);
  }

  get size(): number {
    return this.getCommonValue('size', 2);
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
    return this.isVisible ? (this.frontImage ?? ImageFile.Empty) : (this.backImage ?? ImageFile.Empty);
  }

  get isPeeking(): boolean {
    return this.isMine;
  }
  get isFront(): boolean {
    return this.state === CardState.FRONT;
  }
  get isInMyHand(): boolean {
    return isHandOf(this.location.name, getPeerContext().userId);
  }
  get isInAnyHand(): boolean {
    return isHandLocation(this.location.name);
  }
  get isVisible(): boolean {
    return this.isPeeking || this.isFront || this.isInMyHand;
  }

  faceUp() {
    this.state = CardState.FRONT;
    this.owner = '';
  }

  faceDown() {
    this.state = CardState.BACK;
    this.owner = '';
  }

  toHand(userId: string) {
    this.owner = '';
    this.state = CardState.BACK;
    this.handOrder = Date.now();
    this.setLocation(handLocationOf(userId));
  }

  playFaceUp() {
    this.setLocation('table');
    this.faceUp();
  }

  playFaceDown() {
    this.setLocation('table');
    this.faceDown();
  }

  toTopmost() {
    moveToTopmost(this, ['card-stack']);
  }

  static create(name: string, fornt: string, back: string, size: number = 2, identifier?: string): Card {
    let object: Card;

    if (identifier) {
      object = new Card(identifier);
    } else {
      object = new Card();
    }
    object.createDataElements();

    object.commonDataElement!.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement!.appendChild(DataElement.create('size', size, {}, `size_${object.identifier}`));
    object.imageDataElement!.appendChild(
      DataElement.create('front', fornt, { type: 'image' }, `front_${object.identifier}`)
    );
    object.imageDataElement!.appendChild(
      DataElement.create('back', back, { type: 'image' }, `back_${object.identifier}`)
    );
    object.initialize();

    return object;
  }
}
