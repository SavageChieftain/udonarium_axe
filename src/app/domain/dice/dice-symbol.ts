import { Network } from '@axe/core/index';
import { ImageFile } from '@axe/core/storage/image-file';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { DataElement } from '@axe/domain/data/data-element';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export enum DiceType {
  D2,
  D4,
  D6,
  D8,
  D10,
  D10_10TIMES,
  D12,
  D20,
}

@SyncObject('dice-symbol')
export class DiceSymbol extends TabletopObject {
  override get aliasName(): 'dice-symbol' {
    return super.aliasName as 'dice-symbol';
  }
  @SyncVar() isLock: boolean = false;

  @SyncVar() face: string = '0';
  @SyncVar() owner: string = '';
  @SyncVar() rotate: number = 0;

  @SyncVar() specifyKomaImageFlag: boolean = false;
  @SyncVar('komaImageHeignt') komaImageHeight: number = 100;

  get size(): number {
    return this.getCommonValue('size', 1);
  }
  set size(size: number) {
    this.setCommonValue('size', size);
  }

  get faces(): string[] {
    return this.imageDataElement.children.map((element) => (element as DataElement).name);
  }
  override get imageFile(): ImageFile {
    if (this.faces.length) return this.getImageFile(this.faces[0]) ?? ImageFile.Empty;
    return ImageFile.Empty;
  }

  get ownerName(): string {
    const object = PeerCursor.findByUserId(this.owner);
    return object ? object.name : '';
  }
  get hasOwner(): boolean {
    return 0 < this.owner.length;
  }
  get ownerIsOnline(): boolean {
    return this.isOwnerOnline(Network.peerContexts);
  }
  isOwnerOnline(peerContexts: { userId: string; isOpen: boolean }[]): boolean {
    return this.hasOwner && peerContexts.some((context) => context.userId === this.owner && context.isOpen);
  }
  get isMine(): boolean {
    return this.isOwnedBy(Network.peerContext.userId);
  }
  isOwnedBy(userId: string): boolean {
    return userId === this.owner;
  }
  get isVisible(): boolean {
    return !this.hasOwner || this.isMine;
  }

  diceRoll(): string {
    const faces = this.faces;
    this.face = 0 < faces.length ? faces[Math.floor(Math.random() * faces.length)] : '';
    return this.face;
  }

  setDicetype(type: DiceType) {
    this.makeDiceFace(type);
  }

  private makeDiceFace(type: DiceType, identifierSuffix?: string): DataElement[] {
    let sided: number;
    const faces: DataElement[] = [];
    let faceGeneratorFunc: (index: number) => string = (index) => `${index + 1}`;

    switch (type) {
      case DiceType.D2:
        sided = 2;
        break;
      case DiceType.D4:
        sided = 4;
        break;
      case DiceType.D6:
        sided = 6;
        break;
      case DiceType.D8:
        sided = 8;
        break;
      case DiceType.D10_10TIMES:
        faceGeneratorFunc = (index) => `${index + 1}0`;
      // falls through
      case DiceType.D10:
        sided = 10;
        break;
      case DiceType.D12:
        sided = 12;
        break;
      case DiceType.D20:
        sided = 20;
        break;
      default:
        sided = 2;
        break;
    }

    for (let i = 0; i < sided; i++) {
      const faceName = faceGeneratorFunc(i);
      const identifier = identifierSuffix != null ? `${faceName}_${identifierSuffix}` : undefined;
      faces.push(DataElement.create(faceName, '', { type: 'image' }, identifier));
    }

    this.imageDataElement.children.forEach((element) => element.destroy());
    faces.forEach((element) => this.imageDataElement.appendChild(element));
    this.face = faces[0].name;

    return faces;
  }

  static create(name: string, type: DiceType, size: number, identifier?: string): DiceSymbol {
    const object: DiceSymbol = identifier ? new DiceSymbol(identifier) : new DiceSymbol();

    object.createDataElements();
    object.commonDataElement.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement.appendChild(DataElement.create('size', size, {}, `size_${object.identifier}`));

    object.makeDiceFace(type, object.identifier);
    object.initialize();
    return object;
  }
}
