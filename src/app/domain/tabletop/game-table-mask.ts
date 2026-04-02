import { Network } from '@axe/core/index';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

@SyncObject('table-mask')
export class GameTableMask extends TabletopObject {
  override get aliasName(): 'table-mask' {
    return super.aliasName as 'table-mask';
  }
  @SyncVar() isLock: boolean = false;
  @SyncVar() dispLockMark: boolean = true;

  @SyncVar() owner: string = '';
  @SyncVar() scratchingGrids: string = '';
  @SyncVar() scratchedGrids: string = '';
  //  @SyncVar() isScratchPreviewOnGMMode = false;
  @SyncVar() isPreview = false;

  get width(): number {
    return this.getCommonValue('width', 1);
  }
  get height(): number {
    return this.getCommonValue('height', 1);
  }
  get opacity(): number {
    return this.getOpacityValue();
  }

  get color(): string {
    const element = this.getElement('color', this.commonDataElement);
    return element ? `${element.value}` : '#555555';
  }
  set color(color: string) {
    this.setCommonValue('color', color);
  }

  get bgcolor(): string {
    const element = this.getElement('color', this.commonDataElement);
    return element ? `${element.currentValue}` : '#0a0a0a';
  }
  set bgcolor(bgcolor: string) {
    const element = this.getElement('color', this.commonDataElement);
    if (element) element.currentValue = bgcolor;
  }

  get ownerName(): string {
    const object = PeerCursor.findByUserId(this.owner);
    return object ? object.name : '';
  }

  get ownerColor(): string {
    return '#444444';
  }

  get hasOwner(): boolean {
    return this.owner.length > 0;
  }
  get ownerIsOnline(): boolean {
    return this.isOwnerOnline(Network.peerContext, Network.peerContexts);
  }
  isOwnerOnline(
    self: { userId: string; isOpen: boolean },
    peerContexts: { peerId: string; userId?: string; isOpen: boolean }[]
  ): boolean {
    if (!this.hasOwner) return false;
    return (
      (self.userId === this.owner && self.isOpen) ||
      peerContexts.some((context) => {
        const cursor = PeerCursor.findByPeerId(context.peerId);
        return cursor && cursor.userId === this.owner && context.isOpen;
      })
    );
  }

  get isMine(): boolean {
    return this.isOwnedBy(Network.peerContext.userId);
  }
  isOwnedBy(userId: string): boolean {
    return userId === this.owner;
  }

  static create(name: string, width: number, height: number, opacity: number, identifier?: string): GameTableMask {
    let object: GameTableMask;

    if (identifier) {
      object = new GameTableMask(identifier);
    } else {
      object = new GameTableMask();
    }
    object.createDataElements();

    object.commonDataElement.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement.appendChild(DataElement.create('width', width, {}, `width_${object.identifier}`));
    object.commonDataElement.appendChild(DataElement.create('height', height, {}, `height_${object.identifier}`));
    object.commonDataElement.appendChild(
      DataElement.create(
        'opacity',
        opacity,
        { type: DataElementType.NUMBER_RESOURCE, currentValue: opacity },
        `opacity_${object.identifier}`
      )
    );
    object.initialize();

    return object;
  }
}
