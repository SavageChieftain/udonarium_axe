import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { STAMP_CATEGORIES, StampCategory, StampDef } from '@axe/features/map-maker/assets/stamp-types';
import { getStampById, getStampsByCategory, STAMPS } from '@axe/features/map-maker/assets/stamps';
import { EditorTool, MapMakerState } from '@axe/features/map-maker/editor/map-maker-state';
import {
  cellKey,
  FillStyle,
  LayerKind,
  MapLayer,
  sceneHeightPx,
  sceneWidthPx,
  ShapeKind,
} from '@axe/features/map-maker/model/scene';
import { moveLayer, removeLayer } from '@axe/features/map-maker/model/scene-ops';
import { deserializeScene, serializeScene } from '@axe/features/map-maker/model/serialize';
import { isTextureId, TEXTURE_BASE_COLOR, TEXTURE_IDS, TextureId } from '@axe/features/map-maker/model/textures';
import { exportSceneToBlob } from '@axe/features/map-maker/render/export-image';
import { RenderHelpers, renderScene } from '@axe/features/map-maker/render/render-scene';
import { getStampImage, loadStampImage } from '@axe/features/map-maker/render/stamp-image';
import { createTexturePattern } from '@axe/features/map-maker/render/texture-pattern';
import { TranslocoModule } from '@jsverse/transloco';

interface ToolDef {
  tool: EditorTool;
  icon: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-map-maker-panel',
  templateUrl: './map-maker-panel.component.html',
  host: { class: 'block h-full', tabindex: '0', '(keydown)': 'onKeyDown($event)' },
  providers: [MapMakerState],
  imports: [FormsModule, TranslocoModule],
})
export class MapMakerPanelComponent implements AfterViewInit {
  protected readonly state = inject(MapMakerState);
  private readonly panelService = inject(PanelService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly tabletopService = inject(TabletopService);
  private readonly objectChange = inject(ObjectChangeService);
  protected readonly t = inject(TRANSLATE_FN);

  private readonly exportFn = exportSceneToBlob;

  private readonly board = viewChild<ElementRef<HTMLCanvasElement>>('board');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly textInputRef = viewChild<ElementRef<HTMLInputElement>>('textInput');

  protected readonly tools: ToolDef[] = [
    { tool: 'select', icon: 'pan_tool_alt' },
    { tool: 'cellPaint', icon: 'format_color_fill' },
    { tool: 'cellErase', icon: 'auto_fix_normal' },
    { tool: 'fill', icon: 'format_paint' },
    { tool: 'rect', icon: 'crop_square' },
    { tool: 'ellipse', icon: 'circle' },
    { tool: 'line', icon: 'show_chart' },
    { tool: 'polygon', icon: 'polyline' },
    { tool: 'wall', icon: 'fence' },
    { tool: 'stamp', icon: 'approval' },
    { tool: 'freehand', icon: 'gesture' },
    { tool: 'text', icon: 'title' },
  ];

  protected readonly textureIds = TEXTURE_IDS;
  protected readonly textureBaseColor = TEXTURE_BASE_COLOR;
  protected readonly stampCategories = STAMP_CATEGORIES;
  protected readonly layerKinds: LayerKind[] = ['cell', 'shape', 'wall', 'stamp', 'freehand', 'text'];

  private readonly renderTick = signal(0);
  private readonly pendingStamps = new Set<string>();

  protected readonly cursorCell = signal<{ col: number; row: number } | null>(null);
  protected readonly pendingText = signal<{ x: number; y: number } | null>(null);
  protected readonly textDraft = signal('');
  protected readonly addLayerMenuOpen = signal(false);
  protected readonly mapSettingsOpen = signal(true);
  protected readonly busy = signal(false);
  protected readonly notice = signal('');
  protected readonly errorNotice = signal('');
  protected readonly exportScale = signal(1);
  protected readonly exportGrid = signal(true);
  protected readonly renamingLayerId = signal<string | null>(null);

  private draftPoints: number[] = [];
  private draftStart: { x: number; y: number } | null = null;
  private draftCurrent: { x: number; y: number } | null = null;
  private freehandPoints: number[] = [];
  private dragging = false;
  private lastPaintedCell: string | null = null;
  private lastMove: { x: number; y: number } | null = null;

  protected readonly isGameMaster = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  });

  protected readonly widthPx = computed(() => {
    this.state.sceneTick();
    return sceneWidthPx(this.state.current);
  });

  protected readonly heightPx = computed(() => {
    this.state.sceneTick();
    return sceneHeightPx(this.state.current);
  });

  protected readonly sceneInfo = computed(() => {
    this.state.sceneTick();
    const s = this.state.current;
    return { cols: s.cols, rows: s.rows, cellPx: s.cellPx };
  });

  protected readonly layers = computed(() => {
    this.state.sceneTick();
    return this.state.layersTopFirst();
  });

  protected readonly categoryStamps = computed<StampDef[]>(() => getStampsByCategory(this.state.stampCategory()));

  constructor() {
    queueMicrotask(() => (this.panelService.title = this.t('feature.mapMaker.title')));
    effect(() => {
      this.state.sceneTick();
      this.renderTick();
      this.draftTick();
      this.draw();
    });
  }

  ngAfterViewInit(): void {
    this.draw();
  }

  private readonly draftSignal = signal(0);
  private draftTick(): number {
    return this.draftSignal();
  }
  private bumpDraft(): void {
    this.draftSignal.update((v) => v + 1);
  }

  protected stampDataUri(def: StampDef, color: string | null): string {
    const svg = def.svg.split('currentColor').join(color ?? 'currentColor');
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  private buildHelpers(ctx: CanvasRenderingContext2D): RenderHelpers {
    const defById = new Map(STAMPS.map((d) => [d.id, d]));
    return {
      texturePattern: (fill, cellPx) =>
        isTextureId(fill.textureId) ? createTexturePattern(ctx, fill.textureId, cellPx) : null,
      stampImage: (item) => {
        const def = defById.get(item.stampId);
        if (!def) return null;
        const image = getStampImage(def, item.size, item.color);
        if (!image) this.schedulePending(def, item.size, item.color);
        return image;
      },
    };
  }

  private schedulePending(def: StampDef, size: number, color: string | null): void {
    const key = def.id + '|' + size + '|' + (color ?? '');
    if (this.pendingStamps.has(key)) return;
    this.pendingStamps.add(key);
    loadStampImage(def, size, color)
      .then(() => {
        this.pendingStamps.delete(key);
        this.renderTick.update((v) => v + 1);
      })
      .catch(() => this.pendingStamps.delete(key));
  }

  private draw(): void {
    const canvas = this.board()?.nativeElement;
    if (!canvas) return;
    const scene = this.state.current;
    const w = sceneWidthPx(scene);
    const h = sceneHeightPx(scene);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const helpers = this.buildHelpers(ctx);
    renderScene(ctx, scene, helpers);
    this.drawOverlay(ctx);
  }

  private drawOverlay(ctx: CanvasRenderingContext2D): void {
    const tool = this.state.tool();
    ctx.save();
    ctx.strokeStyle = '#5b9dff';
    ctx.fillStyle = 'rgba(91, 157, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    if (this.draftStart && this.draftCurrent && (tool === 'rect' || tool === 'ellipse' || tool === 'line')) {
      const x = Math.min(this.draftStart.x, this.draftCurrent.x);
      const y = Math.min(this.draftStart.y, this.draftCurrent.y);
      const w = Math.abs(this.draftCurrent.x - this.draftStart.x);
      const h = Math.abs(this.draftCurrent.y - this.draftStart.y);
      ctx.beginPath();
      if (tool === 'ellipse') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      else if (tool === 'line') {
        ctx.moveTo(this.draftStart.x, this.draftStart.y);
        ctx.lineTo(this.draftCurrent.x, this.draftCurrent.y);
      } else ctx.rect(x, y, w, h);
      ctx.stroke();
    }

    if ((tool === 'polygon' || tool === 'wall') && this.draftPoints.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(this.draftPoints[0], this.draftPoints[1]);
      for (let i = 2; i + 1 < this.draftPoints.length; i += 2) ctx.lineTo(this.draftPoints[i], this.draftPoints[i + 1]);
      if (this.draftCurrent) ctx.lineTo(this.draftCurrent.x, this.draftCurrent.y);
      ctx.stroke();
    }

    if (tool === 'freehand' && this.freehandPoints.length >= 4) {
      ctx.beginPath();
      ctx.moveTo(this.freehandPoints[0], this.freehandPoints[1]);
      for (let i = 2; i + 1 < this.freehandPoints.length; i += 2)
        ctx.lineTo(this.freehandPoints[i], this.freehandPoints[i + 1]);
      ctx.stroke();
    }

    if (tool === 'stamp' && this.lastMove && this.state.stampId()) {
      const def = getStampById(this.state.stampId()!);
      if (def) {
        const image = getStampImage(def, this.state.stampSize(), this.state.stampColor());
        if (image) {
          ctx.globalAlpha = 0.5;
          const center = this.stampCenter(this.lastMove.x, this.lastMove.y);
          const half = this.state.stampSize() / 2;
          ctx.drawImage(image, center.x - half, center.y - half, this.state.stampSize(), this.state.stampSize());
          ctx.globalAlpha = 1;
        }
      }
    }

    const sel = this.state.selection();
    if (sel) this.drawSelectionOutline(ctx, sel.layerId, sel.itemId);

    ctx.restore();
  }

  private drawSelectionOutline(ctx: CanvasRenderingContext2D, layerId: string, itemId: string): void {
    const scene = this.state.current;
    const layer = scene.layers.find((l) => l.id === layerId);
    if (!layer) return;
    ctx.save();
    ctx.strokeStyle = '#5b9dff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    if (layer.kind === 'stamp') {
      const item = layer.items.find((i) => i.id === itemId);
      if (item) ctx.strokeRect(item.x - item.size / 2, item.y - item.size / 2, item.size, item.size);
    } else if (layer.kind === 'text') {
      const item = layer.items.find((i) => i.id === itemId);
      if (item) {
        const w = Math.max(item.fontSize, item.fontSize * item.text.length * 0.6);
        ctx.strokeRect(item.x, item.y, w, item.fontSize * 1.2);
      }
    } else if (layer.kind === 'shape') {
      const item = layer.items.find((i) => i.id === itemId);
      if (item) {
        const p = item.points;
        if (item.shape === 'rect' || item.shape === 'ellipse') {
          ctx.strokeRect(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 0);
        } else {
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
          if (Number.isFinite(minX)) ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        }
      }
    }
    ctx.restore();
  }

  protected setTool(tool: EditorTool): void {
    this.cancelDraft();
    this.state.tool.set(tool);
  }

  private toScene(event: PointerEvent): { x: number; y: number } {
    const canvas = this.board()!.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const zoom = this.state.zoom();
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  }

  private stampCenter(x: number, y: number): { x: number; y: number } {
    if (this.state.snapEnabled()) {
      const cellPx = this.state.current.cellPx;
      const col = Math.floor(x / cellPx);
      const row = Math.floor(y / cellPx);
      return { x: (col + 0.5) * cellPx, y: (row + 0.5) * cellPx };
    }
    return { x, y };
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const canvas = this.board()!.nativeElement;
    canvas.setPointerCapture(event.pointerId);
    const pos = this.toScene(event);
    const tool = this.state.tool();
    this.dragging = true;

    if (tool === 'select') {
      this.state.selection.set(this.state.hitTest(pos.x, pos.y));
      this.lastMoveStored = pos;
      this.selectionMoved = false;
      this.bumpDraft();
      return;
    }
    if (tool === 'cellPaint' || tool === 'cellErase') {
      this.state.beginGesture();
      this.lastPaintedCell = null;
      this.paintAt(pos, tool);
      return;
    }
    if (tool === 'fill') {
      const cellPx = this.state.current.cellPx;
      this.state.floodFillAt(Math.floor(pos.x / cellPx), Math.floor(pos.y / cellPx));
      this.dragging = false;
      return;
    }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'line') {
      const sx = this.state.snap(pos.x);
      const sy = this.state.snap(pos.y);
      this.draftStart = { x: sx, y: sy };
      this.draftCurrent = { x: sx, y: sy };
      this.bumpDraft();
      return;
    }
    if (tool === 'polygon' || tool === 'wall') {
      this.draftPoints.push(this.state.snap(pos.x), this.state.snap(pos.y));
      this.draftCurrent = { x: pos.x, y: pos.y };
      this.bumpDraft();
      return;
    }
    if (tool === 'stamp') {
      const center = this.stampCenter(pos.x, pos.y);
      this.state.placeStamp(center.x, center.y);
      this.dragging = false;
      return;
    }
    if (tool === 'freehand') {
      this.state.beginGesture();
      this.freehandPoints = [pos.x, pos.y];
      this.bumpDraft();
      return;
    }
    if (tool === 'text') {
      this.pendingText.set({ x: this.state.snap(pos.x), y: this.state.snap(pos.y) });
      this.textDraft.set('');
      this.dragging = false;
      queueMicrotask(() => this.textInputRef()?.nativeElement.focus());
      return;
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    const pos = this.toScene(event);
    const cellPx = this.state.current.cellPx;
    this.cursorCell.set({ col: Math.floor(pos.x / cellPx), row: Math.floor(pos.y / cellPx) });
    const tool = this.state.tool();
    this.lastMove = pos;

    if (tool === 'stamp') {
      this.bumpDraft();
      return;
    }
    if (!this.dragging) {
      if (tool === 'polygon' || tool === 'wall') {
        this.draftCurrent = { x: pos.x, y: pos.y };
        this.bumpDraft();
      }
      return;
    }

    if (tool === 'select') {
      if (this.state.selection() && this.lastMoveStored) {
        this.state.moveSelection(pos.x - this.lastMoveStored.x, pos.y - this.lastMoveStored.y);
        this.selectionMoved = true;
      }
      this.lastMoveStored = pos;
      this.bumpDraft();
      return;
    }
    if (tool === 'cellPaint' || tool === 'cellErase') {
      this.paintAt(pos, tool);
      return;
    }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'line') {
      this.draftCurrent = { x: this.state.snap(pos.x), y: this.state.snap(pos.y) };
      this.bumpDraft();
      return;
    }
    if (tool === 'freehand') {
      this.freehandPoints.push(pos.x, pos.y);
      this.bumpDraft();
      return;
    }
  }

  private lastMoveStored: { x: number; y: number } | null = null;
  private selectionMoved = false;

  protected onPointerUp(event: PointerEvent): void {
    const canvas = this.board()!.nativeElement;
    canvas.releasePointerCapture?.(event.pointerId);
    const tool = this.state.tool();

    if (tool === 'select' && this.dragging) {
      if (this.selectionMoved) this.state.endGesture();
      this.lastMoveStored = null;
      this.selectionMoved = false;
    } else if ((tool === 'cellPaint' || tool === 'cellErase') && this.dragging) {
      this.state.endGesture();
      this.lastPaintedCell = null;
    } else if ((tool === 'rect' || tool === 'ellipse' || tool === 'line') && this.draftStart && this.draftCurrent) {
      const w = Math.abs(this.draftCurrent.x - this.draftStart.x);
      const h = Math.abs(this.draftCurrent.y - this.draftStart.y);
      if (w > 2 || h > 2) {
        const x = Math.min(this.draftStart.x, this.draftCurrent.x);
        const y = Math.min(this.draftStart.y, this.draftCurrent.y);
        const fill: FillStyle | null = tool === 'line' ? null : this.state.currentFill();
        const points =
          tool === 'line'
            ? [this.draftStart.x, this.draftStart.y, this.draftCurrent.x, this.draftCurrent.y]
            : [x, y, w, h];
        this.state.addShapeItem(tool as ShapeKind, points, fill);
      }
      this.draftStart = null;
      this.draftCurrent = null;
      this.bumpDraft();
    } else if (tool === 'freehand' && this.dragging) {
      this.state.addFreehand(this.freehandPoints);
      this.freehandPoints = [];
      this.bumpDraft();
    }
    this.dragging = false;
  }

  protected onDoubleClick(): void {
    this.commitDraftPolyline();
  }

  private paintAt(pos: { x: number; y: number }, tool: EditorTool): void {
    const cellPx = this.state.current.cellPx;
    const col = Math.floor(pos.x / cellPx);
    const row = Math.floor(pos.y / cellPx);
    if (col < 0 || row < 0 || col >= this.state.current.cols || row >= this.state.current.rows) return;
    const key = cellKey(col, row);
    if (key === this.lastPaintedCell) return;
    this.lastPaintedCell = key;
    if (tool === 'cellPaint') this.state.paintCell(col, row);
    else this.state.eraseCellAt(col, row);
  }

  private commitDraftPolyline(): void {
    const tool = this.state.tool();
    if (tool === 'polygon' && this.draftPoints.length >= 6) {
      this.state.addShapeItem('polygon', this.draftPoints.slice(), this.state.currentFill());
    } else if (tool === 'wall' && this.draftPoints.length >= 4) {
      this.state.addWall(this.draftPoints.slice());
    }
    this.draftPoints = [];
    this.draftCurrent = null;
    this.bumpDraft();
  }

  private cancelDraft(): void {
    this.draftPoints = [];
    this.draftStart = null;
    this.draftCurrent = null;
    this.freehandPoints = [];
    this.bumpDraft();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.state.undo();
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))
    ) {
      event.preventDefault();
      this.state.redo();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.state.selection()) {
        event.preventDefault();
        this.state.deleteSelection();
        this.bumpDraft();
      }
      return;
    }
    if (event.key === 'Escape') {
      this.cancelDraft();
      this.pendingText.set(null);
      return;
    }
    if (event.key === 'Enter') {
      this.commitDraftPolyline();
      return;
    }
  }

  protected onWheel(event: WheelEvent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const delta = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.state.zoom.update((z) => Math.max(0.25, Math.min(3, z * delta)));
    this.draftSignal.update((v) => v + 1);
  }

  protected commitText(): void {
    const pending = this.pendingText();
    const text = this.textDraft().trim();
    if (pending && text) this.state.addTextItem(pending.x, pending.y, text);
    this.pendingText.set(null);
    this.textDraft.set('');
  }

  protected setFillMode(mode: 'solid' | 'texture'): void {
    this.state.fillMode.set(mode);
  }

  protected selectTexture(id: TextureId): void {
    this.state.textureId.set(id);
    this.state.fillMode.set('texture');
  }

  protected setStampCategory(cat: StampCategory): void {
    this.state.stampCategory.set(cat);
  }

  protected selectStamp(id: string): void {
    this.state.stampId.set(id);
  }

  protected zoomIn(): void {
    this.state.zoom.update((z) => Math.min(3, z + 0.25));
    this.draftSignal.update((v) => v + 1);
  }
  protected zoomOut(): void {
    this.state.zoom.update((z) => Math.max(0.25, z - 0.25));
    this.draftSignal.update((v) => v + 1);
  }
  protected zoomReset(): void {
    this.state.zoom.set(1);
    this.draftSignal.update((v) => v + 1);
  }

  protected onResizeCols(value: number): void {
    const cols = Math.max(1, Math.min(100, Math.round(value)));
    this.state.resize(cols, this.state.current.rows);
  }
  protected onResizeRows(value: number): void {
    const rows = Math.max(1, Math.min(100, Math.round(value)));
    this.state.resize(this.state.current.cols, rows);
  }
  protected onCellPx(value: number): void {
    this.state.setCellPx(Math.max(16, Math.min(256, Math.round(value))));
  }

  protected setActive(layer: MapLayer): void {
    this.state.setActiveLayer(layer.id);
  }

  protected toggleVisible(layer: MapLayer): void {
    this.state.applyCommitted(() => {
      const found = this.state.current.layers.find((l) => l.id === layer.id);
      if (found) found.visible = !found.visible;
    });
  }

  protected toggleLocked(layer: MapLayer): void {
    this.state.applyCommitted(() => {
      const found = this.state.current.layers.find((l) => l.id === layer.id);
      if (found) found.locked = !found.locked;
    });
  }

  protected setOpacity(layer: MapLayer, value: number): void {
    this.state.applyCommitted(() => {
      const found = this.state.current.layers.find((l) => l.id === layer.id);
      if (found) found.opacity = value;
    });
  }

  protected moveLayerUp(layer: MapLayer): void {
    this.state.applyCommitted(() => moveLayer(this.state.current, layer.id, 1));
  }
  protected moveLayerDown(layer: MapLayer): void {
    this.state.applyCommitted(() => moveLayer(this.state.current, layer.id, -1));
  }

  protected deleteLayer(layer: MapLayer): void {
    if (!confirm(this.t('feature.mapMaker.layers.deleteConfirm'))) return;
    this.state.applyCommitted(() => removeLayer(this.state.current, layer.id));
    if (this.state.activeLayerId() === layer.id) this.state.activeLayerId.set(null);
  }

  protected startRename(layer: MapLayer): void {
    this.renamingLayerId.set(layer.id);
  }

  protected commitRename(layer: MapLayer, name: string): void {
    this.state.applyCommitted(() => {
      const found = this.state.current.layers.find((l) => l.id === layer.id);
      if (found) found.name = name;
    });
    this.renamingLayerId.set(null);
  }

  protected addLayerOfKind(kind: LayerKind): void {
    this.state.beginGesture();
    this.state.ensureLayerFor(kind);
    this.state.endGesture();
    this.addLayerMenuOpen.set(false);
  }

  protected layerIcon(kind: LayerKind): string {
    switch (kind) {
      case 'cell':
        return 'grid_on';
      case 'shape':
        return 'category';
      case 'wall':
        return 'fence';
      case 'stamp':
        return 'approval';
      case 'freehand':
        return 'gesture';
      case 'text':
        return 'title';
    }
  }

  protected saveJson(): void {
    const json = serializeScene(this.state.current);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'map.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected triggerLoad(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const text = await file.text();
    const scene = deserializeScene(text);
    if (!scene) {
      this.flashError(this.t('feature.mapMaker.actions.loadJsonError'));
      return;
    }
    this.state.loadScene(scene);
  }

  protected async saveImage(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const blob = await this.exportFn(this.state.current, STAMPS, {
        scale: this.exportScale(),
        drawGrid: this.exportGrid(),
      });
      await this.imageStorage.addAsync(blob);
      this.flashNotice(this.t('feature.mapMaker.actions.savedImage'));
    } catch {
      this.flashError(this.t('feature.mapMaker.actions.exportError'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async setAsTable(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const blob = await this.exportFn(this.state.current, STAMPS, {
        scale: this.exportScale(),
        drawGrid: this.exportGrid(),
      });
      const file = await this.imageStorage.addAsync(blob);
      const table = this.tabletopService.currentTable;
      const scene = this.state.current;
      table.imageIdentifier = file.identifier;
      table.width = scene.cols;
      table.height = scene.rows;
      table.gridSize = scene.cellPx;
      this.flashNotice(this.t('feature.mapMaker.actions.setTableDone'));
    } catch {
      this.flashError(this.t('feature.mapMaker.actions.exportError'));
    } finally {
      this.busy.set(false);
    }
  }

  private flashNotice(message: string): void {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), 2500);
  }

  private flashError(message: string): void {
    this.errorNotice.set(message);
    setTimeout(() => this.errorNotice.set(''), 2500);
  }

  protected zoomPercent(): number {
    return Math.round(this.state.zoom() * 100);
  }
}
