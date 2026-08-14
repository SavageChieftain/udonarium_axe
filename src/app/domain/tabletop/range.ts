import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectContext } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { generateUuid } from '@axe/core/util/uuid';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { cellPatternBoundingBox, parseCellPattern } from '@axe/domain/tabletop/cell-pattern';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

@SyncObject('range')
export class RangeArea extends TabletopObject {
  constructor(identifier: string = generateUuid()) {
    super(identifier);
    this.isAltitudeIndicate = true;
  }
  @SyncVar() isLock: boolean = false;
  @SyncVar() rotate: number = 0;
  /** 保存名は綴りを誤ったまま出回っている。手元の名前だけ直し、書き出す名前は据え置く。 */
  @SyncVar('followingCharctorIdentifier') followingCharacterIdentifier: string = '';
  @SyncVar() followingCounterDummy: number = 0; // 追従時再描画用ダミー

  @SyncVar() offSetX: boolean = false;
  @SyncVar() offSetY: boolean = false;
  @SyncVar() gridColor: string = '#FFFF00';
  @SyncVar() rangeColor: string = '#000000';
  @SyncVar('type') private _type: string = 'CORN';
  @SyncVar() fillOutLine: boolean = false;
  @SyncVar() subDivisionSnapPolygonal: boolean = true;
  @SyncVar() cellPattern: string = '';
  @SyncVar() customGridType: string = '';
  @SyncVar() isRotatable: boolean = false;

  get type(): string {
    return this._type;
  }
  set type(type: string) {
    if (type === 'DIAMOND') {
      this._type = 'SQUARE';
      this.rotate = this.rotate + 45;
      return;
    }
    this._type = type;
  }

  get length(): number {
    return this.getCommonValue('length', 1);
  }
  get width(): number {
    return this.getCommonValue('width', 1);
  }

  gridSize: number = 50;

  followingCounterDummyCount() {
    this.followingCounterDummy++;
    if (this.followingCounterDummy >= 50) this.followingCounterDummy = 0;
  }

  override onStoreAdded() {
    super.onStoreAdded();
    this.normalizeLegacyDiamondType();
  }

  override apply(context: ObjectContext) {
    super.apply(context);
    this.normalizeLegacyDiamondType();
  }

  following() {
    const object = ObjectStore.instance.get<GameCharacter>(this.followingCharacterIdentifier);
    if (!object) {
      this.followingCharacterIdentifier = '';
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

    object.commonDataElement!.appendChild(DataElement.create('name', name, {}, `name_${object.identifier}`));
    object.commonDataElement!.appendChild(DataElement.create('length', length, {}, `length_${object.identifier}`));
    object.commonDataElement!.appendChild(DataElement.create('width', width, {}, `width_${object.identifier}`));
    object.commonDataElement!.appendChild(
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

  static createCustom(
    name: string,
    cellPattern: string,
    gridType: string,
    opacity: number,
    options: { isRotatable?: boolean; identifier?: string } = {}
  ): RangeArea {
    const cells = parseCellPattern(cellPattern);
    const bb = cellPatternBoundingBox(cells);
    const width = Math.max(1, bb.width);
    const length = Math.max(1, bb.height);
    const object = RangeArea.create(name, width, length, opacity, options.identifier);
    object._type = 'CUSTOM';
    object.cellPattern = cellPattern;
    object.customGridType = gridType;
    object.isRotatable = options.isRotatable === true;
    return object;
  }

  private normalizeLegacyDiamondType() {
    if (this._type !== 'DIAMOND') return;
    this.attributes['type'] = 'SQUARE';
    this.attributes['rotate'] = Number(this.rotate) + 45;
  }
}
