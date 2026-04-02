import { Network } from '@axe/core/index';
import { ImageFile } from '@axe/core/storage/image-file';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { DataElement } from '@axe/domain/data/data-element';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { moveToTopmost } from '@axe/domain/tabletop/tabletop-object-util';

export enum CardState {
  FRONT,
  BACK,
}

@SyncObject('card')
export class Card extends TabletopObject {
  override get aliasName(): 'card' {
    return super.aliasName as 'card';
  }
  @SyncVar() isLock: boolean = false;
  @SyncVar() dispLockMark: boolean = true;

  @SyncVar() state: CardState = CardState.FRONT;
  @SyncVar() rotate: number = 0;
  @SyncVar() owner: string = '';
  @SyncVar() zindex: number = 0;

  @SyncVar() overViewWidth: number = 250;
  @SyncVar() overViewMaxHeight: number = 250;

  override get isVisibleOnTable(): boolean {
    return this.location.name === 'table' && (!this.parentIsAssigned || this.parentIsDestroyed);
  }

  get name(): string {
    return this.getCommonValue('name', '');
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

  get ownerName(): string {
    const object = PeerCursor.findByUserId(this.owner);
    return object ? object.name : '';
  }

  get hasOwner(): boolean {
    return this.owner.length > 0;
  }
  get ownerIsOnline(): boolean {
    return this.isOwnerOnline(Network.peerContexts);
  }
  isOwnerOnline(peerContexts: { userId: string; isOpen: boolean }[]): boolean {
    return this.hasOwner && peerContexts.some((context) => context.userId === this.owner && context.isOpen);
  }
  get isHand(): boolean {
    return this.isOwnedBy(Network.peerContext.userId);
  }
  isOwnedBy(userId: string): boolean {
    return userId === this.owner;
  }
  get isFront(): boolean {
    return this.state === CardState.FRONT;
  }
  get isVisible(): boolean {
    return this.isHand || this.isFront;
  }

  faceUp() {
    this.state = CardState.FRONT;
    this.owner = '';
  }

  faceDown() {
    this.state = CardState.BACK;
    this.owner = '';
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

    object.commonDataElement.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement.appendChild(DataElement.create('size', size, {}, `size_${object.identifier}`));
    object.imageDataElement.appendChild(
      DataElement.create('front', fornt, { type: 'image' }, `front_${object.identifier}`)
    );
    object.imageDataElement.appendChild(
      DataElement.create('back', back, { type: 'image' }, `back_${object.identifier}`)
    );
    object.initialize();

    return object;
  }
}
