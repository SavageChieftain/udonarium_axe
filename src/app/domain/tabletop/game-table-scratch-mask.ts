import { Network } from '@axe/core/index';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { DataElement } from '@axe/domain/data/data-element';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

import { TabletopObject } from './tabletop-object';

@SyncObject('table-scratch-mask')
export class GameTableScratchMask extends TabletopObject {
  override get aliasName(): 'table-scratch-mask' {
    return 'table-scratch-mask';
  }
  @SyncVar() isLock: boolean = false;
  @SyncVar() isScratch: boolean = false;
  @SyncVar() dispLockMark: boolean = true;
  @SyncVar() color: string = '#404040';
  @SyncVar() changeColor: string = '#FF5050';

  @SyncVar() owner: string = '';

  @SyncVar() M: boolean[] = []; // 保存データ量削減のため1文字変数
  fillMapBack: boolean[] = [];

  @SyncVar() scratchingGrids: string = '';
  @SyncVar() scratchedGrids: string = '';

  @SyncVar() dummy: number = 0;
  private readonly maxSize = 50;
  getMaxSize(): number {
    return this.maxSize;
  }

  getMapXY(x: number, y: number, myScratch: boolean): boolean {
    if (myScratch) {
      if (this.fillMapBack.length < this.M.length) {
        return false;
      }
      return this.fillMapBack[this.maxSize * y + x];
    } else {
      return this.M[this.maxSize * y + x];
    }
  }

  setMapXY(x: number, y: number, bool: boolean) {
    if (this.fillMapBack.length < this.M.length) {
      return;
    }
    this.fillMapBack[this.maxSize * y + x] = bool;
  }

  copyBack2MainMap() {
    this.M = this.fillMapBack.concat();
    this.dummy++;
    if (this.dummy >= 100) this.dummy = 0;
  }

  copyMain2BackMap() {
    this.fillMapBack = this.M.concat();
  }

  reverseMapXY(x: number, y: number) {
    if (this.fillMapBack.length < this.M.length) {
      return;
    }

    this.fillMapBack[this.maxSize * y + x] = !this.fillMapBack[this.maxSize * y + x];
  }

  isMapXYChange(x: number, y: number) {
    if (this.fillMapBack.length < this.M.length) {
      return false;
    }
    if (this.M[this.maxSize * y + x] != this.fillMapBack[this.maxSize * y + x]) {
      return true;
    } else {
      return false;
    }
  }

  get name(): string {
    return this.getCommonValue('name', '');
  }
  get width(): number {
    return this.getCommonValue('width', 1);
  }
  get height(): number {
    return this.getCommonValue('height', 1);
  }

  get ownerName(): string {
    const object = PeerCursor.findByUserId(this.owner);
    return object ? object.name : '';
  }

  get hasOwner(): boolean {
    return 0 < this.owner.length;
  }
  get isMine(): boolean {
    return this.isOwnedBy(Network.peerContext.userId);
  }
  isOwnedBy(userId: string): boolean {
    return userId === this.owner;
  }
  get ownerIsOnline(): boolean {
    return this.isOwnerOnline(Network.peerContexts);
  }
  isOwnerOnline(peerContexts: { userId: string; isOpen: boolean }[]): boolean {
    return this.hasOwner && peerContexts.some((context) => context.userId === this.owner && context.isOpen);
  }

  static create(
    name: string,
    width: number,
    height: number,
    opacity: number,
    identifier?: string
  ): GameTableScratchMask {
    let object: GameTableScratchMask;
    if (identifier) {
      object = new GameTableScratchMask(identifier);
    } else {
      object = new GameTableScratchMask();
    }
    object.M = new Array(object.maxSize * object.maxSize).fill(1);

    object.createDataElements();
    object.commonDataElement.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement.appendChild(DataElement.create('width', width, {}, `width_${object.identifier}`));
    object.commonDataElement.appendChild(DataElement.create('height', height, {}, `height_${object.identifier}`));
    object.initialize();
    return object;
  }
}
