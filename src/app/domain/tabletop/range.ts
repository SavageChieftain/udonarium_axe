import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectStore } from '@axe/core/sync/object-store';
import { generateUuid } from '@axe/core/util/uuid';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

@SyncObject('range')
export class RangeArea extends TabletopObject {
  override get aliasName(): 'range' {
    return 'range';
  }
  constructor(identifier: string = generateUuid()) {
    super(identifier);
    this.isAltitudeIndicate = true;
    this.followingCharctorIdentifier = null!;
  }
  @SyncVar() isLock: boolean = false;
  @SyncVar() rotate: number = 0;
  @SyncVar() followingCharctorIdentifier: string = null!;
  @SyncVar() followingCounterDummy: number = 0; // 追従時再描画用ダミー

  @SyncVar() offSetX: boolean = false;
  @SyncVar() offSetY: boolean = false;
  @SyncVar() gridColor: string = '#FFFF00';
  @SyncVar() rangeColor: string = '#000000';
  @SyncVar() type: string = 'CORN';
  @SyncVar() fillOutLine: boolean = false;
  @SyncVar() subDivisionSnapPolygonal: boolean = true;

  get name(): string {
    return this.getCommonValue('name', '');
  }
  get length(): number {
    return this.getCommonValue('length', 1);
  }
  get width(): number {
    return this.getCommonValue('width', 1);
  }
  get opacity(): number {
    const element = this.getElement('opacity', this.commonDataElement);
    const num = element ? (element.currentValue as number) / (element.value as number) : 1;
    return Number.isNaN(num) ? 1 : num;
  }

  gridSize: number = 50;

  followingCounterDummyCount() {
    this.followingCounterDummy++;
    if (this.followingCounterDummy >= 50) this.followingCounterDummy = 0;
  }

  following() {
    const object = ObjectStore.instance.get(this.followingCharctorIdentifier) as GameCharacter;
    if (!object) {
      this.followingCharctorIdentifier = null!;
      return;
    }

    this.location.x = object.location.x + (this.gridSize * object.size) / 2;
    this.location.y = object.location.y + (this.gridSize * object.size) / 2;
    this.followingCounterDummyCount();
  }

  static create(name: string, width: number, length: number, opacity: number, identifier?: string): RangeArea {
    let object: RangeArea;

    if (identifier) {
      object = new RangeArea(identifier);
    } else {
      object = new RangeArea();
    }
    object.createDataElements();

    object.commonDataElement.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement.appendChild(DataElement.create('length', length, {}, `length_${object.identifier}`));
    object.commonDataElement.appendChild(DataElement.create('width', width, {}, `width_${object.identifier}`));
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
