import { Disclosable, normalizeDisclosureMode } from '@axe/domain/disclosure/disclosure';
import { surfaceOf, TableSurface, TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  buildRangeShapeThumbnail,
  ThumbnailCell,
} from '@axe/features/tabletop/range-shape-editor/range-shape-editor-utils';

export interface ObjectListTypeConfig {
  key: string;
  alias: string;
  icon: string;
  labelKey: string;
}

export const OBJECT_LIST_TYPES: readonly ObjectListTypeConfig[] = [
  { key: 'character', alias: 'character', icon: 'person', labelKey: 'feature.gmObjectList.typeCharacter' },
  { key: 'card', alias: 'card', icon: 'style', labelKey: 'feature.gmObjectList.typeCard' },
  { key: 'card-stack', alias: 'card-stack', icon: 'filter_none', labelKey: 'feature.gmObjectList.typeCardStack' },
  { key: 'dice-symbol', alias: 'dice-symbol', icon: 'casino', labelKey: 'feature.gmObjectList.typeDice' },
  { key: 'text-note', alias: 'text-note', icon: 'sticky_note_2', labelKey: 'feature.gmObjectList.typeNote' },
  { key: 'terrain', alias: 'terrain', icon: 'terrain', labelKey: 'feature.gmObjectList.typeTerrain' },
  { key: 'range', alias: 'range', icon: 'radar', labelKey: 'feature.gmObjectList.typeRange' },
];

export type LocationKind = 'table' | 'common' | 'graveyard' | 'personal' | 'other';

export interface RangeThumbnail {
  viewBox: string;
  cells: ThumbnailCell[];
  gridColor: string;
  rangeColor: string;
}

export interface ObjectRow {
  object: TabletopObject;
  identifier: string;
  typeKey: string;
  imageUrl: string;
  rangeThumbnail: RangeThumbnail | null;
  name: string;
  hasOwner: boolean;
  ownerName: string;
  disclosable: boolean;
  disclosureMode: string;
  locationKind: LocationKind;
  locationDetail: string;
  surface: TableSurface;
  isLock: boolean;
  isHidden: boolean;
  isNpc: boolean;
}

function hasProp<K extends string>(object: unknown, key: K): object is Record<K, unknown> {
  return object != null && key in (object as object);
}

interface ImageLike {
  url?: string;
}

function urlOf(image: ImageLike | null | undefined): string {
  return image?.url ?? '';
}

/** 行アイコン用の画像 URL。キャラ=コマ画像 / カード=表(中身) / 地形=テーブル表示。未対応・未設定は空文字。 */
export function resolveObjectImageUrl(object: TabletopObject, typeKey: string): string {
  const view = object as unknown as {
    imageFile?: ImageLike;
    frontImage?: ImageLike | null;
    wallImage?: ImageLike | null;
    floorImage?: ImageLike | null;
    hasWall?: boolean;
  };
  if (typeKey === 'card') return urlOf(view.frontImage);
  if (typeKey === 'terrain') {
    const wall = view.wallImage;
    const floor = view.floorImage;
    return urlOf(view.hasWall && wall ? wall : (floor ?? wall));
  }
  if (typeKey === 'character' || typeKey === 'dice-symbol') return urlOf(view.imageFile);
  return '';
}

/** カスタム射程範囲（type=CUSTOM）のセル形状サムネイル。カスタム範囲フィールドと同じ描画。それ以外は null。 */
export function resolveRangeThumbnail(object: TabletopObject): RangeThumbnail | null {
  const range = object as unknown as {
    type?: string;
    cellPattern?: string;
    customGridType?: string;
    gridColor?: string;
    rangeColor?: string;
  };
  if (range.type !== 'CUSTOM' || !range.cellPattern) return null;
  const gridType =
    range.customGridType === 'hex-vertical' || range.customGridType === 'hex-horizontal'
      ? range.customGridType
      : 'square';
  const thumbnail = buildRangeShapeThumbnail(range.cellPattern, gridType);
  if (!thumbnail.hasCells) return null;
  return {
    viewBox: thumbnail.viewBox,
    cells: thumbnail.cells,
    gridColor: range.gridColor ?? '#FFFF00',
    rangeColor: range.rangeColor ?? '#000000',
  };
}

export function buildObjectRow(
  object: TabletopObject,
  typeKey: string,
  resolvePeerName: (peerId: string) => string | null
): ObjectRow {
  const locationName = object.location.name;
  const peerName = resolvePeerName(locationName);

  let locationKind: LocationKind;
  let locationDetail = '';
  if (locationName === 'table') {
    locationKind = 'table';
  } else if (locationName === 'graveyard') {
    locationKind = 'graveyard';
  } else if (peerName != null) {
    locationKind = 'personal';
    locationDetail = peerName;
  } else if (locationName === 'common' || locationName === '') {
    locationKind = 'common';
  } else {
    locationKind = 'other';
  }

  const disclosable = hasProp(object, 'disclosureMode');

  return {
    object,
    identifier: object.identifier,
    typeKey,
    imageUrl: resolveObjectImageUrl(object, typeKey),
    rangeThumbnail: typeKey === 'range' ? resolveRangeThumbnail(object) : null,
    name: object.name,
    hasOwner: hasProp(object, 'hasOwner') ? Boolean((object as { hasOwner: boolean }).hasOwner) : false,
    ownerName: hasProp(object, 'ownerName') ? String((object as { ownerName: string }).ownerName) : '',
    disclosable,
    disclosureMode: disclosable ? normalizeDisclosureMode((object as unknown as Disclosable).disclosureMode) : '',
    locationKind,
    locationDetail,
    surface: surfaceOf(object),
    isLock: hasProp(object, 'isLocked')
      ? Boolean((object as { isLocked: boolean }).isLocked)
      : hasProp(object, 'isLock')
        ? Boolean((object as { isLock: boolean }).isLock)
        : false,
    isHidden: hasProp(object, 'hideInventory') ? Boolean((object as { hideInventory: boolean }).hideInventory) : false,
    isNpc: typeKey === 'character' && hasProp(object, 'isNpc') ? Boolean((object as { isNpc: boolean }).isNpc) : false,
  };
}

export function matchesObjectRowQuery(row: ObjectRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return row.name.toLowerCase().includes(q) || row.ownerName.toLowerCase().includes(q);
}
