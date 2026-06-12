export const MAP_SCENE_VERSION = 1;

export const DEFAULT_SCENE_BACKGROUND = '#ece6d9';
export const DEFAULT_SCENE_GRID_COLOR = '#00000059';

export type LayerKind = 'cell' | 'shape' | 'wall' | 'stamp' | 'freehand' | 'text';

export type FillStyle =
  | { type: 'solid'; color: string }
  | { type: 'texture'; textureId: string; scale: number; rotation: number };

export interface StrokeStyle {
  color: string;
  width: number;
}

export interface BaseLayer {
  id: string;
  kind: LayerKind;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export interface CellLayer extends BaseLayer {
  kind: 'cell';
  cells: Record<string, FillStyle>;
}

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'polygon';

export interface ShapeItem {
  id: string;
  shape: ShapeKind;
  points: number[];
  fill: FillStyle | null;
  stroke: StrokeStyle | null;
  rotation: number;
}

export interface ShapeLayer extends BaseLayer {
  kind: 'shape';
  items: ShapeItem[];
}

export interface WallSegment {
  id: string;
  points: number[];
  thickness: number;
  color: string;
}

export interface WallLayer extends BaseLayer {
  kind: 'wall';
  segments: WallSegment[];
}

export interface StampItem {
  id: string;
  stampId: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  color: string | null;
}

export interface StampLayer extends BaseLayer {
  kind: 'stamp';
  items: StampItem[];
}

export interface FreehandStroke {
  id: string;
  points: number[];
  color: string;
  width: number;
}

export interface FreehandLayer extends BaseLayer {
  kind: 'freehand';
  strokes: FreehandStroke[];
}

export type TextAlign = 'left' | 'center' | 'right';

export interface TextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
}

export interface TextLayer extends BaseLayer {
  kind: 'text';
  items: TextItem[];
}

export type MapLayer = CellLayer | ShapeLayer | WallLayer | StampLayer | FreehandLayer | TextLayer;

export interface MapScene {
  version: number;
  cols: number;
  rows: number;
  cellPx: number;
  background: string;
  gridColor: string;
  gridVisible: boolean;
  layers: MapLayer[];
}

export function newId(): string {
  return crypto.randomUUID();
}

export function cellKey(col: number, row: number): string {
  return col + ',' + row;
}

export function parseCellKey(key: string): { col: number; row: number } {
  const comma = key.indexOf(',');
  return { col: Number(key.slice(0, comma)), row: Number(key.slice(comma + 1)) };
}

export function createScene(cols = 20, rows = 15, cellPx = 64): MapScene {
  return {
    version: MAP_SCENE_VERSION,
    cols,
    rows,
    cellPx,
    background: DEFAULT_SCENE_BACKGROUND,
    gridColor: DEFAULT_SCENE_GRID_COLOR,
    gridVisible: true,
    layers: [],
  };
}

export function createLayer(kind: LayerKind, name: string): MapLayer {
  const base: BaseLayer = { id: newId(), kind, name, visible: true, locked: false, opacity: 1 };
  switch (kind) {
    case 'cell':
      return { ...base, kind: 'cell', cells: {} };
    case 'shape':
      return { ...base, kind: 'shape', items: [] };
    case 'wall':
      return { ...base, kind: 'wall', segments: [] };
    case 'stamp':
      return { ...base, kind: 'stamp', items: [] };
    case 'freehand':
      return { ...base, kind: 'freehand', strokes: [] };
    case 'text':
      return { ...base, kind: 'text', items: [] };
  }
}

export function cloneScene(scene: MapScene): MapScene {
  return structuredClone(scene);
}

export function sceneWidthPx(scene: MapScene): number {
  return scene.cols * scene.cellPx;
}

export function sceneHeightPx(scene: MapScene): number {
  return scene.rows * scene.cellPx;
}
