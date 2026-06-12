import { Injectable, signal } from '@angular/core';
import { GridType } from '@axe/domain/tabletop/game-table';
import { StampCategory } from '@axe/features/map-maker/assets/stamp-types';
import { cellCenter, pointToCell } from '@axe/features/map-maker/model/grid-cells';
import { SceneHistory } from '@axe/features/map-maker/model/history';
import {
  CellLayer,
  createLayer,
  createScene,
  FillStyle,
  FreehandLayer,
  FreehandStroke,
  ImageItem,
  ImageLayer,
  LayerKind,
  MapLayer,
  MapScene,
  newId,
  ShapeItem,
  ShapeKind,
  ShapeLayer,
  StampItem,
  StampLayer,
  StrokeStyle,
  TextAlign,
  TextItem,
  TextLayer,
  WallLayer,
  WallSegment,
} from '@axe/features/map-maker/model/scene';
import {
  addImage,
  addLayer,
  addShape,
  addStamp,
  addStroke,
  addText,
  addWallSegment,
  eraseCell,
  floodFill,
  removeImage,
  removeShape,
  removeStamp,
  removeStroke,
  removeText,
  removeWallSegment,
  resizeScene,
  setCell,
  updateImage,
  updateStamp,
  updateText,
} from '@axe/features/map-maker/model/scene-ops';
import { TextureId } from '@axe/features/map-maker/model/textures';

export type EditorTool =
  | 'settings'
  | 'select'
  | 'cellPaint'
  | 'cellErase'
  | 'fill'
  | 'shape'
  | 'line'
  | 'polygon'
  | 'wall'
  | 'freehand'
  | 'text'
  | 'stamp'
  | 'image';

export type ShapeGeneratorKind = 'rect' | 'ellipse' | 'triangle' | 'pentagon' | 'hexagon' | 'star5' | 'star6';

export interface Selection {
  layerId: string;
  itemId: string;
}

@Injectable()
export class MapMakerState {
  private scene: MapScene = createScene();
  private history = new SceneHistory(this.scene);
  private layerCounter = 0;

  private readonly tick = signal(0);
  readonly sceneTick = this.tick.asReadonly();
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  readonly tool = signal<EditorTool>('select');
  readonly activeLayerId = signal<string | null>(null);

  readonly fillMode = signal<'solid' | 'texture'>('solid');
  readonly solidColor = signal('#88aa66');
  readonly textureId = signal<TextureId>('grass');
  readonly textureScale = signal(1);
  readonly textureRotation = signal(0);

  readonly shapeKind = signal<ShapeGeneratorKind>('rect');

  readonly strokeColor = signal('#e8e8ea');
  readonly strokeWidth = signal(3);

  readonly wallThickness = signal(8);
  readonly wallColor = signal('#2a2a30');

  readonly stampCategory = signal<StampCategory>('door');
  readonly stampId = signal<string | null>(null);
  readonly stampSize = signal(64);
  readonly stampRotation = signal(0);
  readonly stampFlipX = signal(false);
  readonly stampFlipY = signal(false);
  readonly stampColor = signal<string | null>(null);

  readonly freehandColor = signal('#e8e8ea');
  readonly freehandWidth = signal(4);

  readonly fontSize = signal(20);
  readonly textColor = signal('#e8e8ea');
  readonly textBold = signal(false);
  readonly textItalic = signal(false);

  readonly pendingImageId = signal<string | null>(null);

  readonly snapEnabled = signal(true);
  readonly zoom = signal(1);

  readonly selection = signal<Selection | null>(null);

  get current(): MapScene {
    return this.scene;
  }

  bump(): void {
    this.tick.update((v) => v + 1);
  }

  private refreshHistoryFlags(): void {
    this.canUndo.set(this.history.canUndo());
    this.canRedo.set(this.history.canRedo());
  }

  beginGesture(): void {}

  endGesture(): void {
    this.history.commit(this.scene);
    this.refreshHistoryFlags();
  }

  applyCommitted(fn: (scene: MapScene) => void): void {
    fn(this.scene);
    this.bump();
    this.endGesture();
  }

  undo(): void {
    const snapshot = this.history.undo();
    if (!snapshot) return;
    this.scene = snapshot;
    this.bump();
    this.refreshHistoryFlags();
  }

  redo(): void {
    const snapshot = this.history.redo();
    if (!snapshot) return;
    this.scene = snapshot;
    this.bump();
    this.refreshHistoryFlags();
  }

  currentFill(): FillStyle {
    if (this.fillMode() === 'texture') {
      return {
        type: 'texture',
        textureId: this.textureId(),
        scale: this.textureScale(),
        rotation: this.textureRotation(),
      };
    }
    return { type: 'solid', color: this.solidColor() };
  }

  currentStroke(): StrokeStyle {
    return { color: this.strokeColor(), width: this.strokeWidth() };
  }

  layersTopFirst(): MapLayer[] {
    return this.scene.layers.slice().reverse();
  }

  activeLayer(): MapLayer | null {
    const id = this.activeLayerId();
    if (!id) return null;
    return this.scene.layers.find((l) => l.id === id) ?? null;
  }

  setActiveLayer(id: string | null): void {
    this.activeLayerId.set(id);
    this.bump();
  }

  private autoLayerName(kind: LayerKind): string {
    this.layerCounter += 1;
    return kind + ' ' + this.layerCounter;
  }

  ensureLayerFor(kind: LayerKind): MapLayer {
    const active = this.activeLayer();
    if (active && active.kind === kind && !active.locked) return active;

    for (let i = this.scene.layers.length - 1; i >= 0; i -= 1) {
      const layer = this.scene.layers[i];
      if (layer.kind === kind && layer.visible && !layer.locked) return layer;
    }

    const created = createLayer(kind, this.autoLayerName(kind));
    addLayer(this.scene, created);
    this.activeLayerId.set(created.id);
    this.bump();
    return created;
  }

  topmostCellLayer(): CellLayer | null {
    const active = this.activeLayer();
    if (active && active.kind === 'cell' && !active.locked) return active;
    for (let i = this.scene.layers.length - 1; i >= 0; i -= 1) {
      const layer = this.scene.layers[i];
      if (layer.kind === 'cell' && layer.visible && !layer.locked) return layer;
    }
    return null;
  }

  paintCell(col: number, row: number): void {
    const layer = this.ensureLayerFor('cell') as CellLayer;
    setCell(layer, col, row, this.currentFill());
    this.bump();
  }

  eraseCellAt(col: number, row: number): void {
    const layer = this.topmostCellLayer();
    if (!layer) return;
    eraseCell(layer, col, row);
    this.bump();
  }

  floodFillAt(col: number, row: number): void {
    const layer = this.ensureLayerFor('cell') as CellLayer;
    this.applyCommitted(() => floodFill(this.scene, layer, col, row, this.currentFill()));
  }

  addShapeItem(shape: ShapeKind, points: number[], fill: FillStyle | null, layerName?: string): void {
    const layer =
      layerName !== undefined
        ? (this.createNamedLayer('shape', layerName) as ShapeLayer)
        : (this.ensureLayerFor('shape') as ShapeLayer);
    const item: ShapeItem = {
      id: '',
      shape,
      points,
      fill,
      stroke: this.currentStroke(),
      rotation: 0,
    };
    this.applyCommitted(() => addShape(layer, item));
  }

  private createNamedLayer(kind: LayerKind, name: string): MapLayer {
    const created = createLayer(kind, name);
    addLayer(this.scene, created);
    this.activeLayerId.set(created.id);
    return created;
  }

  addWall(points: number[]): void {
    const layer = this.ensureLayerFor('wall') as WallLayer;
    const seg: WallSegment = { id: '', points, thickness: this.wallThickness(), color: this.wallColor() };
    this.applyCommitted(() => addWallSegment(layer, seg));
  }

  placeStamp(x: number, y: number): void {
    const stampId = this.stampId();
    if (!stampId) return;
    const layer = this.ensureLayerFor('stamp') as StampLayer;
    const item: StampItem = {
      id: '',
      stampId,
      x,
      y,
      size: this.stampSize(),
      rotation: this.stampRotation(),
      flipX: this.stampFlipX(),
      flipY: this.stampFlipY(),
      color: this.stampColor(),
    };
    this.applyCommitted(() => addStamp(layer, item));
  }

  placeImage(item: ImageItem, layerName: string): void {
    const layer = this.createNamedLayer('image', layerName) as ImageLayer;
    this.applyCommitted(() => addImage(layer, { ...item, id: item.id || newId() }));
  }

  addFreehand(points: number[]): void {
    if (points.length < 4) return;
    const layer = this.ensureLayerFor('freehand') as FreehandLayer;
    const stroke: FreehandStroke = {
      id: '',
      points,
      color: this.freehandColor(),
      width: this.freehandWidth(),
    };
    this.applyCommitted(() => addStroke(layer, stroke));
  }

  addTextItem(x: number, y: number, text: string, align: TextAlign = 'left'): void {
    const layer = this.ensureLayerFor('text') as TextLayer;
    const item: TextItem = {
      id: '',
      x,
      y,
      text,
      fontSize: this.fontSize(),
      color: this.textColor(),
      bold: this.textBold(),
      italic: this.textItalic(),
      align,
    };
    this.applyCommitted(() => addText(layer, item));
  }

  newScene(cols: number, rows: number, cellPx: number, background: string): void {
    this.scene = createScene(cols, rows, cellPx);
    this.scene.background = background;
    this.history.reset(this.scene);
    this.activeLayerId.set(null);
    this.selection.set(null);
    this.bump();
    this.refreshHistoryFlags();
  }

  loadScene(scene: MapScene): void {
    this.scene = scene;
    this.history.reset(this.scene);
    this.activeLayerId.set(null);
    this.selection.set(null);
    this.bump();
    this.refreshHistoryFlags();
  }

  resize(cols: number, rows: number): void {
    this.applyCommitted(() => resizeScene(this.scene, cols, rows));
  }

  setCellPx(cellPx: number): void {
    this.applyCommitted(() => {
      this.scene.cellPx = cellPx;
    });
  }

  setBackground(color: string): void {
    this.applyCommitted(() => {
      this.scene.background = color;
    });
  }

  setGridColor(color: string): void {
    this.applyCommitted(() => {
      this.scene.gridColor = color;
    });
  }

  toggleGrid(): void {
    this.applyCommitted(() => {
      this.scene.gridVisible = !this.scene.gridVisible;
    });
  }

  setGridType(gridType: GridType): void {
    this.applyCommitted(() => {
      this.scene.gridType = gridType;
    });
  }

  private findLayerById(id: string): MapLayer | undefined {
    return this.scene.layers.find((l) => l.id === id);
  }

  deleteSelection(): void {
    const sel = this.selection();
    if (!sel) return;
    const layer = this.findLayerById(sel.layerId);
    if (!layer) {
      this.selection.set(null);
      return;
    }
    this.applyCommitted(() => {
      if (layer.kind === 'stamp') removeStamp(layer, sel.itemId);
      else if (layer.kind === 'text') removeText(layer, sel.itemId);
      else if (layer.kind === 'shape') removeShape(layer, sel.itemId);
      else if (layer.kind === 'wall') removeWallSegment(layer, sel.itemId);
      else if (layer.kind === 'freehand') removeStroke(layer, sel.itemId);
      else if (layer.kind === 'image') removeImage(layer, sel.itemId);
    });
    this.selection.set(null);
  }

  moveSelection(dxPx: number, dyPx: number): void {
    const sel = this.selection();
    if (!sel) return;
    const layer = this.findLayerById(sel.layerId);
    if (!layer) return;
    if (layer.kind === 'stamp') {
      const item = layer.items.find((i) => i.id === sel.itemId);
      if (item) updateStamp(layer, sel.itemId, { x: item.x + dxPx, y: item.y + dyPx });
    } else if (layer.kind === 'text') {
      const item = layer.items.find((i) => i.id === sel.itemId);
      if (item) updateText(layer, sel.itemId, { x: item.x + dxPx, y: item.y + dyPx });
    } else if (layer.kind === 'image') {
      const item = layer.items.find((i) => i.id === sel.itemId);
      if (item) updateImage(layer, sel.itemId, { x: item.x + dxPx, y: item.y + dyPx });
    } else if (layer.kind === 'shape') {
      const item = layer.items.find((i) => i.id === sel.itemId);
      if (item) {
        const moved =
          item.shape === 'rect' || item.shape === 'ellipse'
            ? [item.points[0] + dxPx, item.points[1] + dyPx, ...item.points.slice(2)]
            : item.points.map((v, idx) => (idx % 2 === 0 ? v + dxPx : v + dyPx));
        const shapeLayer = layer;
        const idx = shapeLayer.items.findIndex((i) => i.id === sel.itemId);
        if (idx !== -1) shapeLayer.items[idx] = { ...item, points: moved };
      }
    } else if (layer.kind === 'wall') {
      const idx = layer.segments.findIndex((s) => s.id === sel.itemId);
      if (idx !== -1) {
        const seg = layer.segments[idx];
        const moved = seg.points.map((v, i) => (i % 2 === 0 ? v + dxPx : v + dyPx));
        layer.segments[idx] = { ...seg, points: moved };
      }
    } else if (layer.kind === 'freehand') {
      const idx = layer.strokes.findIndex((s) => s.id === sel.itemId);
      if (idx !== -1) {
        const stroke = layer.strokes[idx];
        const moved = stroke.points.map((v, i) => (i % 2 === 0 ? v + dxPx : v + dyPx));
        layer.strokes[idx] = { ...stroke, points: moved };
      }
    }
    this.bump();
  }

  updateSelectedStamp(patch: Partial<StampItem>): void {
    const sel = this.selection();
    if (!sel) return;
    const layer = this.findLayerById(sel.layerId);
    if (!layer || layer.kind !== 'stamp') return;
    this.applyCommitted(() => updateStamp(layer, sel.itemId, patch));
  }

  selectedItem(): { layer: MapLayer; item: ShapeItem | StampItem | TextItem | ImageItem } | null {
    const sel = this.selection();
    if (!sel) return null;
    const layer = this.findLayerById(sel.layerId);
    if (!layer) return null;
    if (layer.kind === 'stamp') {
      const item = layer.items.find((i) => i.id === sel.itemId);
      return item ? { layer, item } : null;
    }
    if (layer.kind === 'text') {
      const item = layer.items.find((i) => i.id === sel.itemId);
      return item ? { layer, item } : null;
    }
    if (layer.kind === 'shape') {
      const item = layer.items.find((i) => i.id === sel.itemId);
      return item ? { layer, item } : null;
    }
    if (layer.kind === 'image') {
      const item = layer.items.find((i) => i.id === sel.itemId);
      return item ? { layer, item } : null;
    }
    return null;
  }

  updateSelectedImage(patch: Partial<ImageItem>): void {
    const sel = this.selection();
    if (!sel) return;
    const layer = this.findLayerById(sel.layerId);
    if (!layer || layer.kind !== 'image') return;
    this.applyCommitted(() => updateImage(layer, sel.itemId, patch));
  }

  private shapeBbox(item: ShapeItem): { minX: number; minY: number; maxX: number; maxY: number } {
    const p = item.points;
    if (item.shape === 'rect' || item.shape === 'ellipse') {
      const x = p[0] ?? 0;
      const y = p[1] ?? 0;
      const w = p[2] ?? 0;
      const h = p[3] ?? 0;
      return { minX: Math.min(x, x + w), minY: Math.min(y, y + h), maxX: Math.max(x, x + w), maxY: Math.max(y, y + h) };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i + 1 < p.length; i += 2) {
      minX = Math.min(minX, p[i]);
      maxX = Math.max(maxX, p[i]);
      minY = Math.min(minY, p[i + 1]);
      maxY = Math.max(maxY, p[i + 1]);
    }
    if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX, minY, maxX, maxY };
  }

  private pointToPolylineDistance(px: number, py: number, points: number[]): number {
    if (points.length < 2) return Infinity;
    if (points.length < 4) return Math.hypot(px - points[0], py - points[1]);
    let best = Infinity;
    for (let i = 0; i + 3 < points.length; i += 2) {
      const d = this.pointToSegmentDistance(px, py, points[i], points[i + 1], points[i + 2], points[i + 3]);
      if (d < best) best = d;
    }
    return best;
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  private textBbox(item: TextItem): { minX: number; minY: number; maxX: number; maxY: number } {
    const lines = item.text.split('\n');
    const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const width = Math.max(item.fontSize, item.fontSize * longest * 0.6);
    const height = item.fontSize * 1.2 * lines.length;
    let minX = item.x;
    if (item.align === 'center') minX = item.x - width / 2;
    else if (item.align === 'right') minX = item.x - width;
    return { minX, minY: item.y, maxX: minX + width, maxY: item.y + height };
  }

  hitTest(x: number, y: number): Selection | null {
    for (let i = this.scene.layers.length - 1; i >= 0; i -= 1) {
      const layer = this.scene.layers[i];
      if (!layer.visible || layer.locked) continue;
      if (layer.kind === 'stamp') {
        for (let j = layer.items.length - 1; j >= 0; j -= 1) {
          const item = layer.items[j];
          if (Math.hypot(x - item.x, y - item.y) <= item.size / 2) {
            return { layerId: layer.id, itemId: item.id };
          }
        }
      } else if (layer.kind === 'text') {
        for (let j = layer.items.length - 1; j >= 0; j -= 1) {
          const item = layer.items[j];
          const b = this.textBbox(item);
          if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) {
            return { layerId: layer.id, itemId: item.id };
          }
        }
      } else if (layer.kind === 'wall') {
        for (let j = layer.segments.length - 1; j >= 0; j -= 1) {
          const seg = layer.segments[j];
          if (this.pointToPolylineDistance(x, y, seg.points) <= Math.max(6, seg.thickness / 2 + 2)) {
            return { layerId: layer.id, itemId: seg.id };
          }
        }
      } else if (layer.kind === 'freehand') {
        for (let j = layer.strokes.length - 1; j >= 0; j -= 1) {
          const stroke = layer.strokes[j];
          if (this.pointToPolylineDistance(x, y, stroke.points) <= Math.max(6, stroke.width / 2 + 2)) {
            return { layerId: layer.id, itemId: stroke.id };
          }
        }
      } else if (layer.kind === 'image') {
        for (let j = layer.items.length - 1; j >= 0; j -= 1) {
          const item = layer.items[j];
          if (
            x >= item.x - item.w / 2 &&
            x <= item.x + item.w / 2 &&
            y >= item.y - item.h / 2 &&
            y <= item.y + item.h / 2
          ) {
            return { layerId: layer.id, itemId: item.id };
          }
        }
      } else if (layer.kind === 'shape') {
        for (let j = layer.items.length - 1; j >= 0; j -= 1) {
          const item = layer.items[j];
          if (item.shape === 'line') {
            const p = item.points;
            const width = item.stroke ? item.stroke.width : 1;
            if (p.length >= 4 && this.pointToSegmentDistance(x, y, p[0], p[1], p[2], p[3]) <= Math.max(6, width)) {
              return { layerId: layer.id, itemId: item.id };
            }
          } else {
            const b = this.shapeBbox(item);
            if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) {
              return { layerId: layer.id, itemId: item.id };
            }
          }
        }
      }
    }
    return null;
  }

  snap(v: number): number {
    if (this.snapEnabled()) {
      const step = this.scene.cellPx / 2;
      return Math.round(v / step) * step;
    }
    return Math.round(v);
  }

  snapPoint(x: number, y: number): { x: number; y: number } {
    if (!this.snapEnabled()) return { x: Math.round(x), y: Math.round(y) };
    if (this.scene.gridType === GridType.SQUARE) {
      return { x: this.snap(x), y: this.snap(y) };
    }
    const cell = pointToCell(this.scene.gridType, x, y, this.scene.cellPx);
    return cellCenter(this.scene.gridType, cell.col, cell.row, this.scene.cellPx);
  }
}
