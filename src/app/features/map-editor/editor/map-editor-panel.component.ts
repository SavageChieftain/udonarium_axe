import { NgTemplateOutlet } from '@angular/common';
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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ImageTag } from '@axe/domain/media/image-tag';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { GridType } from '@axe/domain/tabletop/game-table';
import {
  imageStampIdentifier,
  isImageStampId,
  MAP_STAMP_TAG,
  toImageStampId,
} from '@axe/features/map-editor/assets/image-stamp';
import { STAMP_CATEGORIES, StampCategory, StampDef } from '@axe/features/map-editor/assets/stamp-types';
import { getStampById, getStampsByCategory, STAMPS } from '@axe/features/map-editor/assets/stamps';
import {
  EditorTool,
  LineKind,
  MapEditorState,
  ShapeGeneratorKind,
} from '@axe/features/map-editor/editor/map-editor-state';
import {
  TextureCropDialogComponent,
  TextureCropDialogOption,
} from '@axe/features/map-editor/editor/texture-crop-dialog.component';
import { catmullRomSegments } from '@axe/features/map-editor/model/curve-geometry';
import { cellCenter, pointToCell } from '@axe/features/map-editor/model/grid-cells';
import {
  cellKey,
  ImageItem,
  LayerKind,
  MapLayer,
  MapScene,
  newId,
  sceneHeightPx,
  sceneWidthPx,
  ShapeItem,
  StrokeDash,
} from '@axe/features/map-editor/model/scene';
import {
  isZipArchive,
  packSceneArchive,
  remapSceneImageIdentifiers,
  unpackSceneArchive,
} from '@axe/features/map-editor/model/scene-archive';
import { moveLayer, removeLayer, removeText, updateText } from '@axe/features/map-editor/model/scene-ops';
import { deserializeScene, serializeScene } from '@axe/features/map-editor/model/serialize';
import { regularPolygonPoints, starPoints } from '@axe/features/map-editor/model/shape-points';
import {
  imageTextureIdentifier,
  isImageTextureId,
  isTextureId,
  normalizeTextureId,
  TEXTURE_ASSET_URLS,
  TEXTURE_BASE_COLOR,
  TEXTURE_IDS,
  TextureId,
} from '@axe/features/map-editor/model/textures';
import { exportSceneToBlob } from '@axe/features/map-editor/render/export-image';
import { getRasterImage, loadRasterImage } from '@axe/features/map-editor/render/raster-image';
import { RenderHelpers, renderScene } from '@axe/features/map-editor/render/render-scene';
import { getStampImage, loadStampImage } from '@axe/features/map-editor/render/stamp-image';
import { createImageTexturePattern } from '@axe/features/map-editor/render/texture-pattern';
import { ConfirmDialogComponent } from '@axe/ui/components/confirm-dialog/confirm-dialog.component';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { TranslocoModule } from '@jsverse/transloco';

export function buildShapeKindPoints(kind: ShapeGeneratorKind): string {
  const cx = 12;
  const cy = 12;
  const r = 9;
  let flat: number[];
  if (kind === 'triangle') flat = regularPolygonPoints(cx, cy, r, 3, -Math.PI / 2);
  else if (kind === 'pentagon') flat = regularPolygonPoints(cx, cy, r, 5, -Math.PI / 2);
  else if (kind === 'hexagon') flat = regularPolygonPoints(cx, cy, r, 6, 0);
  else if (kind === 'star5') flat = starPoints(cx, cy, r, r * 0.382, 5, -Math.PI / 2);
  else if (kind === 'star6') flat = starPoints(cx, cy, r, r * 0.577, 6, -Math.PI / 2);
  else return '';
  const pairs: string[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pairs.push(`${flat[i].toFixed(2)},${flat[i + 1].toFixed(2)}`);
  }
  return pairs.join(' ');
}

const ERASER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/>' +
  '<path d="M6.0 20l4-4"/>' +
  '</svg>';

const SELECT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' +
  '<path d="M7 2 L7 19 L11.3 15.4 L13.9 21.3 L16.6 20.1 L14 14.3 L19.5 13.8 Z"/>' +
  '</svg>';

const FILL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M10 4 L4 10 L11 17 L18 10 L12 4 Z"/>' +
  '<path d="M10 4 L8 2 A 1.8 1.8 0 1 0 5.5 4.5"/>' +
  '<path d="M20.5 13 C 22 15 22.5 16 22.5 17 A 2 2 0 0 1 18.5 17 C 18.5 16 19 15 20.5 13 Z" fill="currentColor" stroke="none"/>' +
  '</svg>';

interface ToolDef {
  tool: EditorTool;
  icon: string;
  key: string;
  svg?: SafeHtml;
}

export const TEXTURE_IMAGE_TAG = 'テクスチャ';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-map-editor-panel',
  templateUrl: './map-editor-panel.component.html',
  host: {
    class: 'block h-full',
    tabindex: '0',
    '(keydown)': 'onKeyDown($event)',
    '(keyup)': 'onKeyUp($event)',
  },
  providers: [MapEditorState],
  imports: [FormsModule, NgTemplateOutlet, TranslocoModule],
})
export class MapEditorPanelComponent implements AfterViewInit {
  protected readonly state = inject(MapEditorState);
  private readonly panelService = inject(PanelService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly tabletopService = inject(TabletopService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly modalService = inject(ModalService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly t = inject(TRANSLATE_FN);

  private readonly exportFn = exportSceneToBlob;
  private readonly loadImageFn = loadRasterImage;

  private readonly board = viewChild<ElementRef<HTMLCanvasElement>>('board');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly textureFileInput = viewChild<ElementRef<HTMLInputElement>>('textureFileInput');
  private readonly stampFileInput = viewChild<ElementRef<HTMLInputElement>>('stampFileInput');
  protected readonly textEditor = viewChild<ElementRef<HTMLElement>>('textEditor');
  private readonly stage = viewChild<ElementRef<HTMLDivElement>>('stage');

  protected readonly settingsTool: ToolDef = { tool: 'settings', icon: 'settings', key: '' };

  protected readonly tools: ToolDef[] = [
    { tool: 'select', icon: '', key: 'V', svg: this.sanitizer.bypassSecurityTrustHtml(SELECT_SVG) },
    { tool: 'cellPaint', icon: 'edit', key: 'B' },
    {
      tool: 'cellErase',
      icon: '',
      key: 'E',
      svg: this.sanitizer.bypassSecurityTrustHtml(ERASER_SVG),
    },
    { tool: 'fill', icon: '', key: 'G', svg: this.sanitizer.bypassSecurityTrustHtml(FILL_SVG) },
    { tool: 'freehand', icon: 'gesture', key: 'F' },
    { tool: 'line', icon: 'show_chart', key: 'L' },
    { tool: 'shape', icon: 'category', key: 'R' },
    { tool: 'polygon', icon: 'polyline', key: 'P' },
    { tool: 'text', icon: 'title', key: 'T' },
    { tool: 'stamp', icon: 'approval', key: 'S' },
    { tool: 'image', icon: 'image', key: 'I' },
  ];

  protected readonly dashKinds: StrokeDash[] = ['solid', 'dashed', 'dotted', 'dashdot', 'longdash'];
  protected readonly lineKinds: LineKind[] = ['straight', 'polyline', 'curve', 'closedCurve'];

  protected readonly shapeKinds: ShapeGeneratorKind[] = [
    'rect',
    'ellipse',
    'triangle',
    'pentagon',
    'hexagon',
    'star5',
    'star6',
  ];

  protected readonly gridTypeOptions: { type: GridType; label: string }[] = [
    { type: GridType.SQUARE, label: 'gridSquare' },
    { type: GridType.HEX_VERTICAL, label: 'gridHexV' },
    { type: GridType.HEX_HORIZONTAL, label: 'gridHexH' },
  ];

  protected readonly GridType = GridType;

  private readonly shortcutToTool = new Map<string, EditorTool>(this.tools.map((d) => [d.key, d.tool]));

  protected readonly textureIds = TEXTURE_IDS;
  protected readonly textureBaseColor = TEXTURE_BASE_COLOR;
  protected readonly textureAssetUrls = TEXTURE_ASSET_URLS;
  protected readonly stampCategories = STAMP_CATEGORIES;
  protected readonly layerKinds: LayerKind[] = ['cell', 'shape', 'stamp', 'freehand', 'text', 'image'];

  private readonly renderTick = signal(0);
  private readonly pendingStamps = new Set<string>();
  private readonly pendingImages = new Set<string>();

  protected readonly cursorCell = signal<{ col: number; row: number } | null>(null);
  protected readonly spacePan = signal(false);
  protected readonly panning = signal(false);
  protected readonly draftCount = signal(0);
  protected readonly editingText = signal<{
    x: number;
    y: number;
    layerId: string | null;
    itemId: string | null;
  } | null>(null);
  protected readonly textDraft = signal('');
  protected readonly addLayerMenuOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly notice = signal('');
  protected readonly errorNotice = signal('');
  protected readonly exportScale = signal(1);
  protected readonly renamingLayerId = signal<string | null>(null);
  protected readonly draggingLayerId = signal<string | null>(null);
  protected readonly dragOverLayerId = signal<string | null>(null);

  private draftPoints: number[] = [];
  private draftStart: { x: number; y: number } | null = null;
  private draftCurrent: { x: number; y: number } | null = null;
  private freehandPoints: number[] = [];
  private dragging = false;
  private lastPaintedCell: string | null = null;
  private lastPaintPx: { x: number; y: number } | null = null;
  private vectorErasing = false;
  private lastErasePx: { x: number; y: number } | null = null;
  private lastMove: { x: number; y: number } | null = null;
  private lastPointerScene: { x: number; y: number } | null = null;
  private pendingTextFocus = false;
  private pendingTextInitial = '';
  private panLast: { x: number; y: number } | null = null;
  private imageResize: { item: ImageItem; anchorX: number; anchorY: number } | null = null;
  private curveDrag: { index: number } | null = null;

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

  protected readonly layerThumbnails = computed<Map<string, string>>(() => {
    this.state.sceneTick();
    this.renderTick();
    const map = new Map<string, string>();
    for (const layer of this.state.layersTopFirst()) {
      const url = this.renderLayerThumb(layer);
      if (url) map.set(layer.id, url);
    }
    return map;
  });

  protected readonly categoryStamps = computed<StampDef[]>(() => getStampsByCategory(this.state.stampCategory()));

  protected readonly imageTextures = computed<ImageFile[]>(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('image-tag')();
    return ImageTag.searchImages([TEXTURE_IMAGE_TAG]);
  });

  protected readonly stampImages = computed<ImageFile[]>(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('image-tag')();
    return ImageTag.searchImages([MAP_STAMP_TAG]);
  });

  protected readonly canvasCursor = computed(() => {
    if (this.spacePan()) return this.panning() ? 'grabbing' : 'grab';
    return this.state.tool() === 'select' ? 'default' : 'crosshair';
  });

  protected readonly canFinishDraft = computed(() => {
    const n = this.draftCount();
    const tool = this.state.tool();
    if (tool === 'polygon') return n >= 3;
    return n >= 2;
  });

  constructor() {
    queueMicrotask(() => (this.panelService.title = this.t('feature.mapEditor.title')));
    effect(() => {
      this.state.sceneTick();
      this.renderTick();
      this.draftTick();
      this.draw();
    });
    effect(() => {
      const el = this.textEditor()?.nativeElement;
      if (!this.pendingTextFocus || !el) return;
      this.pendingTextFocus = false;
      this.focusTextEditor(el);
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
    this.draftCount.set(this.draftPoints.length / 2);
  }

  protected shapeKindSvg(kind: ShapeGeneratorKind): SafeHtml {
    let inner: string;
    if (kind === 'rect') {
      inner = '<rect x="4" y="6" width="16" height="12" fill="none" stroke="currentColor" stroke-width="2"/>';
    } else if (kind === 'ellipse') {
      inner = '<ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="currentColor" stroke-width="2"/>';
    } else {
      const pts = buildShapeKindPoints(kind);
      inner = `<polygon points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    }
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">${inner}</svg>`
    );
  }

  protected lineKindSvg(kind: LineKind): SafeHtml {
    let inner: string;
    if (kind === 'straight') {
      inner = '<line x1="4" y1="18" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    } else if (kind === 'curve') {
      inner =
        '<path d="M3 18 C 7 4 13 22 21 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    } else if (kind === 'closedCurve') {
      inner =
        '<path d="M12 4 C 17 2 21 6 19 10 C 18 12 21 14 18 17 C 15 20 9 21 6 17 C 3 13 7 12 5 9 C 3 6 8 5 12 4 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';
    } else {
      inner =
        '<polyline points="3,18 9,8 15,14 21,5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">${inner}</svg>`
    );
  }

  protected stampDataUri(def: StampDef, color: string | null): string {
    const svg = def.svg.split('currentColor').join(color ?? 'currentColor');
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  private buildHelpers(ctx: CanvasRenderingContext2D): RenderHelpers {
    const defById = new Map(STAMPS.map((d) => [d.id, d]));
    return {
      texturePattern: (fill, cellPx) => {
        if (isImageTextureId(fill.textureId)) {
          const url = this.imageStorage.get(imageTextureIdentifier(fill.textureId))?.url;
          if (!url) return null;
          const image = getRasterImage(url);
          if (!image) {
            this.schedulePendingImage(url);
            return null;
          }
          return createImageTexturePattern(ctx, image, cellPx, fill.scale, fill.rotation);
        }
        const id = normalizeTextureId(fill.textureId);
        if (!isTextureId(id)) return null;
        const url = TEXTURE_ASSET_URLS[id];
        const image = getRasterImage(url);
        if (!image) {
          this.schedulePendingImage(url);
          return null;
        }
        return createImageTexturePattern(ctx, image, cellPx, fill.scale, fill.rotation);
      },
      stampImage: (item) => {
        if (isImageStampId(item.stampId)) {
          const url = this.imageStorage.get(imageStampIdentifier(item.stampId))?.url;
          if (!url) return null;
          const image = getRasterImage(url);
          if (!image) this.schedulePendingImage(url);
          return image;
        }
        const def = defById.get(item.stampId);
        if (!def) return null;
        const image = getStampImage(def, item.size, item.color);
        if (!image) this.schedulePending(def, item.size, item.color);
        return image;
      },
      rasterImage: (item) => {
        const url = this.imageStorage.get(item.imageIdentifier)?.url;
        if (!url) return null;
        const image = getRasterImage(url);
        if (!image) this.schedulePendingImage(url);
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

  private previewStampImage(stampId: string, size: number): HTMLImageElement | null {
    if (isImageStampId(stampId)) {
      const url = this.imageStorage.get(imageStampIdentifier(stampId))?.url;
      if (!url) return null;
      const image = getRasterImage(url);
      if (!image) this.schedulePendingImage(url);
      return image;
    }
    const def = getStampById(stampId);
    if (!def) return null;
    const image = getStampImage(def, size, this.state.stampColor());
    if (!image) this.schedulePending(def, size, this.state.stampColor());
    return image;
  }

  private schedulePendingImage(url: string): void {
    if (this.pendingImages.has(url)) return;
    this.pendingImages.add(url);
    this.loadImageFn(url)
      .then(() => {
        this.pendingImages.delete(url);
        this.renderTick.update((v) => v + 1);
      })
      .catch(() => this.pendingImages.delete(url));
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
    renderScene(ctx, scene, helpers, { hideTextId: this.editingText()?.itemId ?? undefined });
    this.drawOverlay(ctx);
  }

  private drawOverlay(ctx: CanvasRenderingContext2D): void {
    const tool = this.state.tool();
    const scene = this.state.current;
    ctx.save();
    ctx.strokeStyle = '#5b9dff';
    ctx.fillStyle = 'rgba(91, 157, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    if (
      (tool === 'cellPaint' || tool === 'fill' || (tool === 'cellErase' && !this.isVectorEraseTarget())) &&
      this.lastMove &&
      !this.panning()
    ) {
      const cellPx = scene.cellPx;
      const cell = pointToCell(scene.gridType, this.lastMove.x, this.lastMove.y, cellPx);
      if (cell.col >= 0 && cell.row >= 0 && cell.col < scene.cols && cell.row < scene.rows) {
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(91, 157, 255, 0.25)';
        ctx.strokeStyle = '#5b9dff';
        ctx.lineWidth = 1;
        if (scene.gridType === GridType.SQUARE) {
          ctx.fillRect(cell.col * cellPx, cell.row * cellPx, cellPx, cellPx);
          ctx.strokeRect(cell.col * cellPx + 0.5, cell.row * cellPx + 0.5, cellPx - 1, cellPx - 1);
        } else {
          const center = cellCenter(scene.gridType, cell.col, cell.row, cellPx);
          ctx.beginPath();
          ctx.arc(center.x, center.y, cellPx * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    if (tool === 'cellErase' && this.isVectorEraseTarget() && this.lastMove && !this.panning()) {
      ctx.save();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(91, 157, 255, 0.15)';
      ctx.strokeStyle = '#5b9dff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.lastMove.x, this.lastMove.y, this.state.eraserSize(), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (
      this.draftStart &&
      this.draftCurrent &&
      (tool === 'shape' || (tool === 'line' && this.state.lineKind() === 'straight'))
    ) {
      const x = Math.min(this.draftStart.x, this.draftCurrent.x);
      const y = Math.min(this.draftStart.y, this.draftCurrent.y);
      const w = Math.abs(this.draftCurrent.x - this.draftStart.x);
      const h = Math.abs(this.draftCurrent.y - this.draftStart.y);
      if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(this.draftStart.x, this.draftStart.y);
        ctx.lineTo(this.draftCurrent.x, this.draftCurrent.y);
        ctx.stroke();
      } else {
        const kind = this.state.shapeKind();
        ctx.save();
        ctx.fillStyle = 'rgba(91, 157, 255, 0.2)';
        ctx.beginPath();
        if (kind === 'ellipse') {
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        } else if (kind === 'rect') {
          ctx.rect(x, y, w, h);
        } else {
          const pts = this.generateShapePoints(kind, x, y, w, h);
          if (pts.length >= 2) {
            ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i + 1 < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
            ctx.closePath();
          }
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      this.drawMeasureBox(ctx, `${(w / scene.cellPx).toFixed(1)} × ${(h / scene.cellPx).toFixed(1)}`);
    }

    if ((tool === 'polygon' || (tool === 'line' && this.multiClickLine())) && this.draftPoints.length >= 2) {
      const lineKind = this.state.lineKind();
      const smooth = tool === 'line' && (lineKind === 'curve' || lineKind === 'closedCurve');
      if (smooth) {
        const verts = this.draftPoints.slice();
        if (this.draftCurrent) verts.push(this.draftCurrent.x, this.draftCurrent.y);
        const closed = lineKind === 'closedCurve';
        if (closed && verts.length >= 6) {
          ctx.save();
          ctx.fillStyle = 'rgba(91, 157, 255, 0.2)';
          this.traceCurvePath(ctx, verts, true);
          ctx.fill();
          ctx.restore();
        }
        this.traceCurvePath(ctx, verts, closed);
        ctx.stroke();
        this.drawSegmentMeasure(ctx);
      } else {
        if (tool === 'polygon' && this.draftPoints.length >= 4) {
          ctx.save();
          ctx.fillStyle = 'rgba(91, 157, 255, 0.2)';
          ctx.beginPath();
          ctx.moveTo(this.draftPoints[0], this.draftPoints[1]);
          for (let i = 2; i + 1 < this.draftPoints.length; i += 2)
            ctx.lineTo(this.draftPoints[i], this.draftPoints[i + 1]);
          if (this.draftCurrent) ctx.lineTo(this.draftCurrent.x, this.draftCurrent.y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.moveTo(this.draftPoints[0], this.draftPoints[1]);
        for (let i = 2; i + 1 < this.draftPoints.length; i += 2)
          ctx.lineTo(this.draftPoints[i], this.draftPoints[i + 1]);
        if (this.draftCurrent) ctx.lineTo(this.draftCurrent.x, this.draftCurrent.y);
        ctx.stroke();
        this.drawSegmentMeasure(ctx);
      }
    }

    if (tool === 'line' && this.state.lineKind() === 'straight' && this.draftStart && this.draftCurrent) {
      this.drawSegmentMeasure(ctx);
    }

    if (tool === 'freehand' && this.freehandPoints.length >= 4) {
      ctx.beginPath();
      ctx.moveTo(this.freehandPoints[0], this.freehandPoints[1]);
      for (let i = 2; i + 1 < this.freehandPoints.length; i += 2)
        ctx.lineTo(this.freehandPoints[i], this.freehandPoints[i + 1]);
      ctx.stroke();
    }

    if (tool === 'stamp' && this.lastMove && this.state.stampId()) {
      const stampId = this.state.stampId()!;
      const size = this.state.stampSize();
      const image = this.previewStampImage(stampId, size);
      if (image) {
        const center = this.stampCenter(this.lastMove.x, this.lastMove.y);
        const iw = image.naturalWidth || image.width || size;
        const ih = image.naturalHeight || image.height || size;
        const fitScale = iw && ih ? Math.min(size / iw, size / ih) : 1;
        const w = iw * fitScale;
        const h = ih * fitScale;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(center.x, center.y);
        if (this.state.stampRotation()) ctx.rotate((this.state.stampRotation() * Math.PI) / 180);
        ctx.scale(this.state.stampFlipX() ? -1 : 1, this.state.stampFlipY() ? -1 : 1);
        ctx.drawImage(image, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    if (tool === 'image' && this.lastMove && this.state.pendingImageId()) {
      const url = this.imageStorage.get(this.state.pendingImageId()!)?.url;
      const image = url ? getRasterImage(url) : null;
      if (image) {
        const fit = this.fitImageSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(image, this.lastMove.x - fit.w / 2, this.lastMove.y - fit.h / 2, fit.w, fit.h);
        ctx.restore();
      } else if (url) {
        this.schedulePendingImage(url);
      }
    }

    const sel = this.state.selection();
    if (sel) this.drawSelectionOutline(ctx, sel.layerId, sel.itemId);

    const selImage = this.selectedImageItem();
    if (selImage) this.drawImageHandles(ctx, selImage);

    const selCurve = this.selectedCurveItem();
    if (selCurve) this.drawCurveHandles(ctx, selCurve);

    ctx.restore();
  }

  private fitImageSize(naturalW: number, naturalH: number): { w: number; h: number } {
    const cellPx = this.state.current.cellPx;
    const w = naturalW > 0 ? naturalW : 4 * cellPx;
    const h = naturalH > 0 ? naturalH : 4 * cellPx;
    const max = 8 * cellPx;
    const longest = Math.max(w, h);
    const ratio = longest > max ? max / longest : 1;
    return { w: w * ratio, h: h * ratio };
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
    } else if (layer.kind === 'image') {
      const item = layer.items.find((i) => i.id === itemId);
      if (item) ctx.strokeRect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h);
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
          this.strokePolylineBbox(ctx, p);
        }
      }
    } else if (layer.kind === 'freehand') {
      const stroke = layer.strokes.find((s) => s.id === itemId);
      if (stroke) this.strokePolylineBbox(ctx, stroke.points);
    }
    ctx.restore();
  }

  private selectedImageItem(): ImageItem | null {
    if (this.state.tool() !== 'select') return null;
    const sel = this.state.selection();
    if (!sel) return null;
    const layer = this.state.current.layers.find((l) => l.id === sel.layerId);
    if (!layer || layer.kind !== 'image') return null;
    return layer.items.find((i) => i.id === sel.itemId) ?? null;
  }

  private selectedCurveItem(): ShapeItem | null {
    if (this.state.tool() !== 'select') return null;
    const sel = this.state.selection();
    if (!sel) return null;
    const layer = this.state.current.layers.find((l) => l.id === sel.layerId);
    if (!layer || layer.kind !== 'shape') return null;
    const item = layer.items.find((i) => i.id === sel.itemId);
    if (!item || (item.shape !== 'curve' && item.shape !== 'closedCurve')) return null;
    return item;
  }

  private curveAnchorAt(item: ShapeItem, x: number, y: number): number {
    const p = item.points;
    for (let i = 0; i * 2 + 1 < p.length; i += 1) {
      if (Math.abs(x - p[i * 2]) <= 7 && Math.abs(y - p[i * 2 + 1]) <= 7) return i;
    }
    return -1;
  }

  private drawCurveHandles(ctx: CanvasRenderingContext2D, item: ShapeItem): void {
    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#5b9dff';
    ctx.lineWidth = 1.5;
    const p = item.points;
    for (let i = 0; i * 2 + 1 < p.length; i += 1) {
      ctx.beginPath();
      ctx.arc(p[i * 2], p[i * 2 + 1], 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private imageCorners(item: ImageItem): { x: number; y: number }[] {
    const hw = item.w / 2;
    const hh = item.h / 2;
    return [
      { x: item.x - hw, y: item.y - hh },
      { x: item.x + hw, y: item.y - hh },
      { x: item.x + hw, y: item.y + hh },
      { x: item.x - hw, y: item.y + hh },
    ];
  }

  private drawImageHandles(ctx: CanvasRenderingContext2D, item: ImageItem): void {
    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = '#5b9dff';
    const s = 8;
    for (const c of this.imageCorners(item)) {
      ctx.fillRect(c.x - s / 2, c.y - s / 2, s, s);
    }
    ctx.restore();
  }

  private imageHandleAt(item: ImageItem, x: number, y: number): number {
    const corners = this.imageCorners(item);
    for (let i = 0; i < corners.length; i += 1) {
      if (Math.abs(x - corners[i].x) <= 6 && Math.abs(y - corners[i].y) <= 6) return i;
    }
    return -1;
  }

  private traceCurvePath(ctx: CanvasRenderingContext2D, verts: number[], closed: boolean): void {
    ctx.beginPath();
    if (verts.length < 2) return;
    ctx.moveTo(verts[0], verts[1]);
    for (const seg of catmullRomSegments(verts, closed)) {
      ctx.bezierCurveTo(seg.c1x, seg.c1y, seg.c2x, seg.c2y, seg.x, seg.y);
    }
    if (closed) ctx.closePath();
  }

  private strokePolylineBbox(ctx: CanvasRenderingContext2D, p: number[]): void {
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

  private generateShapePoints(kind: ShapeGeneratorKind, x: number, y: number, w: number, h: number): number[] {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    let unit: number[];
    if (kind === 'triangle') unit = regularPolygonPoints(0, 0, 1, 3, -Math.PI / 2);
    else if (kind === 'pentagon') unit = regularPolygonPoints(0, 0, 1, 5, -Math.PI / 2);
    else if (kind === 'hexagon') unit = regularPolygonPoints(0, 0, 1, 6, 0);
    else if (kind === 'star5') unit = starPoints(0, 0, 1, 0.382, 5, -Math.PI / 2);
    else if (kind === 'star6') unit = starPoints(0, 0, 1, 0.577, 6, -Math.PI / 2);
    else return [];
    const scaled: number[] = [];
    for (let i = 0; i + 1 < unit.length; i += 2) {
      scaled.push(cx + unit[i] * rx, cy + unit[i + 1] * ry);
    }
    return scaled;
  }

  private drawMeasureBox(ctx: CanvasRenderingContext2D, text: string): void {
    if (!this.lastMove) return;
    this.drawMeasureAt(ctx, text, this.lastMove.x + 12, this.lastMove.y - 12);
  }

  private drawMeasureAt(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
    ctx.save();
    ctx.setLineDash([]);
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'middle';
    const metrics = ctx.measureText(text);
    const padX = 6;
    const w = metrics.width + padX * 2;
    const h = 18;
    const r = 4;
    const bx = x;
    const by = y - h / 2;
    ctx.fillStyle = 'rgba(20, 22, 28, 0.85)';
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + w, by, bx + w, by + h, r);
    ctx.arcTo(bx + w, by + h, bx, by + h, r);
    ctx.arcTo(bx, by + h, bx, by, r);
    ctx.arcTo(bx, by, bx + w, by, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8e8ea';
    ctx.fillText(text, bx + padX, y);
    ctx.restore();
  }

  private drawSegmentMeasure(ctx: CanvasRenderingContext2D): void {
    const cellPx = this.state.current.cellPx;
    const tool = this.state.tool();
    let ax: number;
    let ay: number;
    let bx: number;
    let by: number;
    let prevAngle: number | null = null;
    if (tool === 'line' && this.state.lineKind() === 'straight') {
      if (!this.draftStart || !this.draftCurrent) return;
      ax = this.draftStart.x;
      ay = this.draftStart.y;
      bx = this.draftCurrent.x;
      by = this.draftCurrent.y;
    } else {
      const n = this.draftPoints.length;
      if (n < 2 || !this.draftCurrent) return;
      ax = this.draftPoints[n - 2];
      ay = this.draftPoints[n - 1];
      bx = this.draftCurrent.x;
      by = this.draftCurrent.y;
      if (n >= 4) {
        prevAngle = Math.atan2(ay - this.draftPoints[n - 3], ax - this.draftPoints[n - 4]);
      }
    }
    const len = Math.hypot(bx - ax, by - ay);
    const cells = this.t('feature.mapEditor.measure.cells', { n: (len / cellPx).toFixed(1) });
    let angleRad = Math.atan2(by - ay, bx - ax);
    if (prevAngle !== null) angleRad = angleRad - prevAngle;
    let deg = Math.round((angleRad * 180) / Math.PI);
    deg = ((deg % 360) + 360) % 360;
    if (deg > 180) deg -= 360;
    const angle = this.t('feature.mapEditor.measure.angle', { deg });
    this.drawMeasureAt(ctx, `${cells} ${angle}`, bx + 12, by - 12);
  }

  protected setTool(tool: EditorTool): void {
    if (this.editingText()) this.commitTextEdit();
    this.cancelDraft();
    this.state.tool.set(tool);
  }

  protected setLineKind(kind: LineKind): void {
    this.cancelDraft();
    this.state.lineKind.set(kind);
  }

  private multiClickLine(): boolean {
    const kind = this.state.lineKind();
    return kind === 'polyline' || kind === 'curve' || kind === 'closedCurve';
  }

  private toScene(event: PointerEvent): { x: number; y: number } {
    const canvas = this.board()!.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const zoom = this.state.zoom();
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  }

  private stampCenter(x: number, y: number): { x: number; y: number } {
    if (this.state.snapEnabled()) {
      const scene = this.state.current;
      const cell = pointToCell(scene.gridType, x, y, scene.cellPx);
      return cellCenter(scene.gridType, cell.col, cell.row, scene.cellPx);
    }
    return { x, y };
  }

  protected onPointerDown(event: PointerEvent): void {
    const canvas = this.board()!.nativeElement;
    if (event.button === 1 || (event.button === 0 && this.spacePan())) {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      this.panning.set(true);
      this.panLast = { x: event.clientX, y: event.clientY };
      return;
    }
    if (event.button !== 0) return;
    if (this.editingText()) {
      this.commitTextEdit();
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    const pos = this.toScene(event);
    this.lastPointerScene = pos;
    const tool = this.state.tool();
    this.dragging = true;

    if (tool === 'select') {
      const selImage = this.selectedImageItem();
      if (selImage) {
        const handle = this.imageHandleAt(selImage, pos.x, pos.y);
        if (handle !== -1) {
          const opposite = this.imageCorners(selImage)[(handle + 2) % 4];
          this.imageResize = { item: selImage, anchorX: opposite.x, anchorY: opposite.y };
          this.state.beginGesture();
          this.bumpDraft();
          return;
        }
      }
      const selCurve = this.selectedCurveItem();
      if (selCurve) {
        const anchor = this.curveAnchorAt(selCurve, pos.x, pos.y);
        if (anchor !== -1) {
          this.curveDrag = { index: anchor };
          this.state.beginGesture();
          this.bumpDraft();
          return;
        }
      }
      this.state.selection.set(this.state.hitTest(pos.x, pos.y));
      this.lastMoveStored = pos;
      this.selectionMoved = false;
      this.bumpDraft();
      return;
    }
    if (tool === 'cellErase' && this.isVectorEraseTarget()) {
      this.vectorErasing = true;
      this.lastErasePx = null;
      this.state.beginGesture();
      this.eraseVectorAlong(pos);
      return;
    }
    if (tool === 'cellPaint' || tool === 'cellErase') {
      this.vectorErasing = false;
      this.state.beginGesture();
      this.lastPaintedCell = null;
      this.lastPaintPx = null;
      this.paintAt(pos, tool);
      return;
    }
    if (tool === 'fill') {
      const scene = this.state.current;
      const cell = pointToCell(scene.gridType, pos.x, pos.y, scene.cellPx);
      this.state.floodFillAt(cell.col, cell.row);
      this.dragging = false;
      return;
    }
    if (tool === 'shape' || (tool === 'line' && this.state.lineKind() === 'straight')) {
      const snapped = this.state.snapPoint(pos.x, pos.y);
      this.draftStart = { x: snapped.x, y: snapped.y };
      this.draftCurrent = { x: snapped.x, y: snapped.y };
      this.bumpDraft();
      return;
    }
    if (tool === 'polygon' || (tool === 'line' && this.multiClickLine())) {
      const snapped = this.state.snapPoint(pos.x, pos.y);
      this.draftPoints.push(snapped.x, snapped.y);
      this.draftCurrent = { x: pos.x, y: pos.y };
      this.bumpDraft();
      return;
    }
    if (tool === 'stamp') {
      const center = this.stampCenter(pos.x, pos.y);
      this.state.placeStamp(center.x, center.y, this.stampLayerName());
      this.dragging = false;
      return;
    }
    if (tool === 'image') {
      this.dragging = false;
      void this.placeImageAt(pos.x, pos.y);
      return;
    }
    if (tool === 'freehand') {
      this.state.beginGesture();
      this.freehandPoints = [pos.x, pos.y];
      this.bumpDraft();
      return;
    }
    if (tool === 'text') {
      const snapped = this.state.snapPoint(pos.x, pos.y);
      this.dragging = false;
      this.startTextEdit(snapped.x, snapped.y, null, null, '');
      return;
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.panning() && this.panLast) {
      event.preventDefault();
      const container = this.stage()?.nativeElement;
      if (container) {
        container.scrollLeft -= event.clientX - this.panLast.x;
        container.scrollTop -= event.clientY - this.panLast.y;
      }
      this.panLast = { x: event.clientX, y: event.clientY };
      return;
    }
    const pos = this.toScene(event);
    const scene = this.state.current;
    this.cursorCell.set(pointToCell(scene.gridType, pos.x, pos.y, scene.cellPx));
    const tool = this.state.tool();
    this.lastMove = pos;

    if (tool === 'stamp' || tool === 'image') {
      this.bumpDraft();
      return;
    }
    if (!this.dragging) {
      if (tool === 'polygon' || (tool === 'line' && this.multiClickLine())) {
        this.draftCurrent = { x: pos.x, y: pos.y };
      }
      if (
        tool === 'cellPaint' ||
        tool === 'cellErase' ||
        tool === 'fill' ||
        tool === 'polygon' ||
        (tool === 'line' && this.multiClickLine())
      ) {
        this.bumpDraft();
      }
      return;
    }

    if (tool === 'select') {
      if (this.imageResize) {
        this.resizeImageTo(pos.x, pos.y);
        this.bumpDraft();
        return;
      }
      if (this.curveDrag) {
        const snapped = this.state.snapPoint(pos.x, pos.y);
        this.state.updateSelectedShapePointLive(this.curveDrag.index, snapped.x, snapped.y);
        this.bumpDraft();
        return;
      }
      if (this.state.selection() && this.lastMoveStored) {
        this.state.moveSelection(pos.x - this.lastMoveStored.x, pos.y - this.lastMoveStored.y);
        this.selectionMoved = true;
      }
      this.lastMoveStored = pos;
      this.bumpDraft();
      return;
    }
    if (tool === 'cellErase' && this.vectorErasing) {
      this.eraseVectorAlong(pos);
      return;
    }
    if (tool === 'cellPaint' || tool === 'cellErase') {
      this.paintAt(pos, tool);
      return;
    }
    if (tool === 'shape' || (tool === 'line' && this.state.lineKind() === 'straight')) {
      this.draftCurrent = this.state.snapPoint(pos.x, pos.y);
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

  private resizeImageTo(px: number, py: number): void {
    const anchor = this.imageResize;
    if (!anchor) return;
    const w = Math.max(8, Math.abs(px - anchor.anchorX));
    const h = Math.max(8, Math.abs(py - anchor.anchorY));
    const cx = px >= anchor.anchorX ? anchor.anchorX + w / 2 : anchor.anchorX - w / 2;
    const cy = py >= anchor.anchorY ? anchor.anchorY + h / 2 : anchor.anchorY - h / 2;
    this.state.updateSelectedImageLive({ x: cx, y: cy, w, h });
  }

  protected onPointerUp(event: PointerEvent): void {
    const canvas = this.board()!.nativeElement;
    canvas.releasePointerCapture?.(event.pointerId);
    if (this.panning()) {
      this.panning.set(false);
      this.panLast = null;
      return;
    }
    const tool = this.state.tool();

    if (tool === 'select' && this.imageResize) {
      this.state.endGesture();
      this.imageResize = null;
      this.dragging = false;
      this.bumpDraft();
      return;
    } else if (tool === 'select' && this.curveDrag) {
      this.state.endGesture();
      this.curveDrag = null;
      this.dragging = false;
      this.bumpDraft();
      return;
    } else if (tool === 'select' && this.dragging) {
      if (this.selectionMoved) this.state.endGesture();
      this.lastMoveStored = null;
      this.selectionMoved = false;
    } else if ((tool === 'cellPaint' || tool === 'cellErase') && this.dragging) {
      this.state.endGesture();
      this.lastPaintedCell = null;
      this.lastPaintPx = null;
    } else if (
      (tool === 'shape' || (tool === 'line' && this.state.lineKind() === 'straight')) &&
      this.draftStart &&
      this.draftCurrent
    ) {
      const w = Math.abs(this.draftCurrent.x - this.draftStart.x);
      const h = Math.abs(this.draftCurrent.y - this.draftStart.y);
      if (w > 2 || h > 2) {
        const x = Math.min(this.draftStart.x, this.draftCurrent.x);
        const y = Math.min(this.draftStart.y, this.draftCurrent.y);
        if (tool === 'line') {
          this.state.addShapeItem(
            'line',
            [this.draftStart.x, this.draftStart.y, this.draftCurrent.x, this.draftCurrent.y],
            null
          );
        } else {
          this.commitShape(x, y, w, h);
        }
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
    const tool = this.state.tool();
    const hasDraft = this.draftPoints.length > 0;
    if ((tool === 'polygon' || (tool === 'line' && this.multiClickLine())) && hasDraft) {
      this.commitDraftPolyline();
      return;
    }
    if (tool !== 'text' && tool !== 'select') return;
    const pos = this.lastPointerScene;
    if (!pos) return;
    const sel = this.state.hitTest(pos.x, pos.y);
    if (!sel) return;
    const layer = this.state.current.layers.find((l) => l.id === sel.layerId);
    if (!layer || layer.kind !== 'text') return;
    const item = layer.items.find((i) => i.id === sel.itemId);
    if (!item) return;
    this.state.fontSize.set(item.fontSize);
    this.state.textColor.set(item.color);
    this.state.textBold.set(item.bold);
    this.state.textItalic.set(item.italic);
    this.startTextEdit(item.x, item.y, layer.id, item.id, item.text);
  }

  private startTextEdit(x: number, y: number, layerId: string | null, itemId: string | null, text: string): void {
    this.pendingTextFocus = true;
    this.pendingTextInitial = text;
    this.textDraft.set(text);
    this.editingText.set({ x, y, layerId, itemId });
  }

  private focusTextEditor(el: HTMLElement): void {
    el.textContent = this.pendingTextInitial;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  protected onTextInput(event: Event): void {
    const el = event.target as HTMLElement;
    this.textDraft.set(el.innerText);
  }

  protected onTextEditorKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancelTextEdit();
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      this.commitTextEdit();
    }
  }

  protected commitTextEdit(): void {
    const editing = this.editingText();
    if (!editing) return;
    const text = this.textDraft().replace(/^\s+|\s+$/g, '');
    if (editing.itemId) {
      const layer = this.state.current.layers.find((l) => l.id === editing.layerId);
      if (layer && layer.kind === 'text') {
        if (!text) {
          this.state.applyCommitted(() => removeText(layer, editing.itemId!));
        } else {
          this.state.applyCommitted(() =>
            updateText(layer, editing.itemId!, {
              text,
              fontSize: this.state.fontSize(),
              color: this.state.textColor(),
              bold: this.state.textBold(),
              italic: this.state.textItalic(),
            })
          );
        }
      }
    } else if (text) {
      this.state.addTextItem(editing.x, editing.y, text);
    }
    this.editingText.set(null);
    this.textDraft.set('');
  }

  protected cancelTextEdit(): void {
    this.editingText.set(null);
    this.textDraft.set('');
  }

  protected finishDraft(): void {
    this.commitDraftPolyline();
  }

  protected cancelDraftPublic(): void {
    this.cancelDraft();
  }

  protected deleteSelectionPublic(): void {
    if (!this.state.selection()) return;
    this.state.deleteSelection();
    this.bumpDraft();
  }

  private eraseVectorAlong(pos: { x: number; y: number }): void {
    const radius = this.state.eraserSize();
    const from = this.lastErasePx ?? pos;
    const dist = Math.hypot(pos.x - from.x, pos.y - from.y);
    const step = Math.max(1, radius / 2);
    const samples = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= samples; i += 1) {
      const t = i / samples;
      this.state.eraseAt(from.x + (pos.x - from.x) * t, from.y + (pos.y - from.y) * t, radius);
    }
    this.lastErasePx = pos;
  }

  private paintAt(pos: { x: number; y: number }, tool: EditorTool): void {
    const cellPx = this.state.current.cellPx;
    const from = this.lastPaintPx ?? pos;
    const dist = Math.hypot(pos.x - from.x, pos.y - from.y);
    const step = Math.max(1, cellPx / 3);
    const samples = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= samples; i += 1) {
      const t = i / samples;
      this.paintSampleAt(from.x + (pos.x - from.x) * t, from.y + (pos.y - from.y) * t, tool);
    }
    this.lastPaintPx = pos;
  }

  private paintSampleAt(x: number, y: number, tool: EditorTool): void {
    const scene = this.state.current;
    const { col, row } = pointToCell(scene.gridType, x, y, scene.cellPx);
    if (col < 0 || row < 0 || col >= scene.cols || row >= scene.rows) return;
    const key = cellKey(col, row);
    if (key === this.lastPaintedCell) return;
    this.lastPaintedCell = key;
    if (tool === 'cellPaint') this.state.paintCell(col, row);
    else this.state.eraseCellAt(col, row);
  }

  private commitDraftPolyline(): void {
    const tool = this.state.tool();
    if (tool === 'polygon' && this.draftPoints.length >= 6) {
      this.state.addShapeItem('polygon', this.draftPoints.slice(), this.state.currentFill(), this.shapeLayerName());
    } else if (tool === 'line' && this.state.lineKind() === 'polyline' && this.draftPoints.length >= 4) {
      this.state.addShapeItem('polyline', this.draftPoints.slice(), null, this.shapeLayerName());
    } else if (tool === 'line' && this.state.lineKind() === 'curve' && this.draftPoints.length >= 4) {
      this.state.addShapeItem('curve', this.draftPoints.slice(), null, this.shapeLayerName());
    } else if (tool === 'line' && this.state.lineKind() === 'closedCurve' && this.draftPoints.length >= 6) {
      this.state.addShapeItem('closedCurve', this.draftPoints.slice(), this.state.currentFill(), this.shapeLayerName());
    }
    this.draftPoints = [];
    this.draftCurrent = null;
    this.bumpDraft();
  }

  private commitShape(x: number, y: number, w: number, h: number): void {
    const kind = this.state.shapeKind();
    const fill = this.state.currentFill();
    const name = this.shapeLayerName();
    if (kind === 'rect' || kind === 'ellipse') {
      this.state.addShapeItem(kind, [x, y, w, h], fill, name);
      return;
    }
    const points = this.generateShapePoints(kind, x, y, w, h);
    if (points.length >= 6) this.state.addShapeItem('polygon', points, fill, name);
  }

  private shapeLayerName(): string {
    const tool = this.state.tool();
    let label: string;
    if (tool === 'polygon') {
      label = this.t('feature.mapEditor.tools.polygon');
    } else if (tool === 'line' && this.multiClickLine()) {
      label = this.t('feature.mapEditor.props.lineKinds.' + this.state.lineKind());
    } else {
      label = this.t('feature.mapEditor.props.shapeKinds.' + this.state.shapeKind());
    }
    this.shapeLayerCounter += 1;
    return label + ' ' + this.shapeLayerCounter;
  }

  private imageLayerName(): string {
    this.imageLayerCounter += 1;
    return this.t('feature.mapEditor.layers.kinds.image') + ' ' + this.imageLayerCounter;
  }

  private stampLayerName(): string {
    this.stampLayerCounter += 1;
    return this.t('feature.mapEditor.layers.kinds.stamp') + ' ' + this.stampLayerCounter;
  }

  private shapeLayerCounter = 0;
  private imageLayerCounter = 0;
  private stampLayerCounter = 0;

  protected async chooseImage(): Promise<void> {
    const id = await this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: false }).catch(() => null);
    if (id) this.state.pendingImageId.set(id);
  }

  protected pendingImageUrl(): string | null {
    const id = this.state.pendingImageId();
    return id ? (this.imageStorage.get(id)?.url ?? null) : null;
  }

  private async placeImageAt(x: number, y: number): Promise<void> {
    const id = this.state.pendingImageId();
    if (!id) return;
    const url = this.imageStorage.get(id)?.url;
    const cellPx = this.state.current.cellPx;
    let naturalW = 4 * cellPx;
    let naturalH = 4 * cellPx;
    if (url) {
      try {
        const image = await this.loadImageFn(url);
        naturalW = image.naturalWidth || image.width || naturalW;
        naturalH = image.naturalHeight || image.height || naturalH;
      } catch {
        naturalW = 4 * cellPx;
        naturalH = 4 * cellPx;
      }
    }
    const fit = this.fitImageSize(naturalW, naturalH);
    const item: ImageItem = {
      id: newId(),
      imageIdentifier: id,
      x,
      y,
      w: fit.w,
      h: fit.h,
      rotation: 0,
      opacity: 1,
    };
    this.state.placeImage(item, this.imageLayerName());
  }

  private cancelDraft(): void {
    this.draftPoints = [];
    this.draftStart = null;
    this.draftCurrent = null;
    this.freehandPoints = [];
    this.bumpDraft();
  }

  private isTypingTarget(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    return (
      !!target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    );
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space') this.spacePan.set(false);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.isTypingTarget(event)) return;
    if (event.code === 'Space') {
      event.preventDefault();
      this.spacePan.set(true);
      return;
    }
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
      this.cancelTextEdit();
      return;
    }
    if (event.key === 'Enter') {
      this.commitDraftPolyline();
      return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      const tool = this.shortcutToTool.get(event.key.toUpperCase());
      if (tool) {
        event.preventDefault();
        this.setTool(tool);
      }
    }
  }

  protected onWheel(event: WheelEvent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const before = this.state.zoom();
    const delta = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const after = Math.max(0.25, Math.min(3, before * delta));
    if (after === before) return;
    const container = this.stage()?.nativeElement;
    const canvas = this.board()?.nativeElement;
    if (!container || !canvas) {
      this.applyZoom(after);
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offsetX = canvasRect.left - containerRect.left + container.scrollLeft;
    const offsetY = canvasRect.top - containerRect.top + container.scrollTop;
    const sceneX = (event.clientX - canvasRect.left) / before;
    const sceneY = (event.clientY - canvasRect.top) / before;
    this.applyZoom(after);
    const scene = this.state.current;
    canvas.style.width = sceneWidthPx(scene) * after + 'px';
    canvas.style.height = sceneHeightPx(scene) * after + 'px';
    container.scrollLeft = offsetX + sceneX * after - (event.clientX - containerRect.left);
    container.scrollTop = offsetY + sceneY * after - (event.clientY - containerRect.top);
  }

  private applyZoom(z: number): void {
    this.state.zoom.set(z);
    this.draftSignal.update((v) => v + 1);
  }

  protected readonly lastBackgroundColor = signal('#ece6d9');

  protected readonly canvasBackground = computed(() => {
    this.state.sceneTick();
    return this.state.current.background === 'transparent'
      ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px'
      : null;
  });

  protected backgroundTransparent(): boolean {
    return this.state.current.background === 'transparent';
  }

  protected backgroundColorValue(): string {
    const bg = this.state.current.background;
    return bg === 'transparent' ? this.lastBackgroundColor() : bg;
  }

  protected setBackgroundColor(color: string): void {
    this.lastBackgroundColor.set(color);
    this.state.setBackground(color);
  }

  protected toggleBackgroundTransparent(transparent: boolean): void {
    if (transparent) {
      const bg = this.state.current.background;
      if (bg !== 'transparent') this.lastBackgroundColor.set(bg);
      this.state.setBackground('transparent');
    } else {
      this.state.setBackground(this.lastBackgroundColor());
    }
  }

  protected setFillMode(mode: 'solid' | 'texture'): void {
    this.state.fillMode.set(mode);
  }

  protected selectTexture(id: TextureId): void {
    this.state.textureId.set(id);
    this.state.fillMode.set('texture');
  }

  protected selectImageTexture(file: ImageFile): void {
    this.state.textureId.set('image:' + file.identifier);
    this.state.fillMode.set('texture');
  }

  protected isActiveImageTexture(file: ImageFile): boolean {
    return this.state.textureId() === 'image:' + file.identifier;
  }

  protected triggerTextureUpload(): void {
    this.textureFileInput()?.nativeElement.click();
  }

  protected async onTextureFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const blob = await this.modalService
      .open<Blob | null>(TextureCropDialogComponent, { objectUrl } as TextureCropDialogOption)
      .catch(() => null);
    URL.revokeObjectURL(objectUrl);
    if (!blob) return;
    const imageFile = await this.imageStorage.addAsync(blob);
    const tag = ImageTag.create(imageFile.identifier);
    tag.tag = TEXTURE_IMAGE_TAG;
    this.objectChange.notifyCollectionChanged('image-tag');
    this.state.fillMode.set('texture');
    this.state.textureId.set('image:' + imageFile.identifier);
  }

  protected setStampCategory(cat: StampCategory): void {
    this.state.stampCategory.set(cat);
  }

  protected selectStamp(id: string): void {
    this.state.stampId.set(id);
  }

  protected selectImageStamp(file: ImageFile): void {
    this.state.stampId.set(toImageStampId(file.identifier));
    this.state.stampColor.set(null);
    this.state.stampSize.set(Math.min(256, Math.max(16, this.state.current.cellPx)));
  }

  protected isActiveImageStamp(file: ImageFile): boolean {
    return this.state.stampId() === toImageStampId(file.identifier);
  }

  protected isImageStampSelected(): boolean {
    const id = this.state.stampId();
    return !!id && isImageStampId(id);
  }

  protected triggerStampUpload(): void {
    this.stampFileInput()?.nativeElement.click();
  }

  protected async onStampFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const imageFile = await this.imageStorage.addAsync(file);
    const tag = ImageTag.get(imageFile.identifier) ?? ImageTag.create(imageFile.identifier);
    tag.tag = MAP_STAMP_TAG;
    this.objectChange.notifyCollectionChanged('image-tag');
    this.selectImageStamp(imageFile);
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

  protected onLayerDragStart(layer: MapLayer, event: DragEvent): void {
    this.draggingLayerId.set(layer.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', layer.id);
    }
  }

  protected onLayerDragOver(layer: MapLayer, event: DragEvent): void {
    if (!this.draggingLayerId()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.dragOverLayerId() !== layer.id) this.dragOverLayerId.set(layer.id);
  }

  protected onLayerDrop(target: MapLayer, event: DragEvent): void {
    event.preventDefault();
    const draggedId = this.draggingLayerId();
    this.draggingLayerId.set(null);
    this.dragOverLayerId.set(null);
    if (!draggedId || draggedId === target.id) return;
    const order = this.layers().map((l) => l.id);
    const from = order.indexOf(draggedId);
    const to = order.indexOf(target.id);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, draggedId);
    this.state.reorderLayersTopFirst(order);
  }

  protected onLayerDragEnd(): void {
    this.draggingLayerId.set(null);
    this.dragOverLayerId.set(null);
  }

  private renderLayerThumb(layer: MapLayer): string {
    if (typeof document === 'undefined') return '';
    const scene = this.state.current;
    const w = sceneWidthPx(scene);
    const h = sceneHeightPx(scene);
    if (w <= 0 || h <= 0) return '';
    const maxDim = 48;
    const scale = Math.min(maxDim / w, maxDim / h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const single: MapScene = { ...scene, gridVisible: false, background: 'transparent', layers: [layer] };
    ctx.scale(scale, scale);
    renderScene(ctx, single, this.buildHelpers(ctx), { drawGrid: false });
    try {
      return canvas.toDataURL();
    } catch {
      return '';
    }
  }

  protected deleteLayer(layer: MapLayer): void {
    if (layer.locked) return;
    this.modalService
      .open<boolean>(ConfirmDialogComponent, {
        message: this.t('feature.mapEditor.layers.deleteConfirm'),
        okLabel: this.t('common.button.delete'),
        danger: true,
      })
      .then((ok) => {
        if (ok !== true) return;
        this.state.applyCommitted(() => removeLayer(this.state.current, layer.id));
        if (this.state.activeLayerId() === layer.id) this.state.activeLayerId.set(null);
      });
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

  private isVectorEraseTarget(): boolean {
    const layer = this.state.activeLayer();
    return !!layer && !layer.locked && layer.kind !== 'cell';
  }

  protected addLayerOfKind(kind: LayerKind): void {
    const label = this.t('feature.mapEditor.layers.kinds.' + kind);
    const count = this.state.current.layers.filter((l) => l.kind === kind).length + 1;
    this.state.addEmptyLayer(kind, label + ' ' + count);
    this.addLayerMenuOpen.set(false);
  }

  protected layerIcon(kind: LayerKind): string {
    switch (kind) {
      case 'cell':
        return 'grid_on';
      case 'shape':
        return 'category';
      case 'stamp':
        return 'approval';
      case 'freehand':
        return 'gesture';
      case 'text':
        return 'title';
      case 'image':
        return 'image';
    }
  }

  private collectArchiveIdentifiers(): { textureIds: Set<string>; imageIds: Set<string> } {
    const textureIds = new Set<string>();
    const imageIds = new Set<string>();
    const addFill = (fill: { type: string; textureId?: string } | null | undefined): void => {
      if (fill && fill.type === 'texture' && fill.textureId && isImageTextureId(fill.textureId)) {
        textureIds.add(imageTextureIdentifier(fill.textureId));
      }
    };
    for (const layer of this.state.current.layers) {
      if (layer.kind === 'cell') {
        for (const fill of Object.values(layer.cells)) addFill(fill);
      } else if (layer.kind === 'shape') {
        for (const item of layer.items) {
          addFill(item.fill);
          addFill(item.stroke?.fill);
        }
      } else if (layer.kind === 'image') {
        for (const item of layer.items) imageIds.add(item.imageIdentifier);
      }
    }
    return { textureIds, imageIds };
  }

  private async collectArchiveBytes(ids: Set<string>): Promise<Record<string, Uint8Array>> {
    const out: Record<string, Uint8Array> = {};
    for (const id of ids) {
      const blob = this.imageStorage.get(id)?.blob;
      if (!blob) continue;
      out[id] = new Uint8Array(await blob.arrayBuffer());
    }
    return out;
  }

  protected async save(): Promise<void> {
    const json = serializeScene(this.state.current);
    const { textureIds, imageIds } = this.collectArchiveIdentifiers();
    const textures = await this.collectArchiveBytes(textureIds);
    const images = await this.collectArchiveBytes(imageIds);
    const archive = packSceneArchive(json, textures, images);
    const blob = new Blob([archive.slice()], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'map.zip';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected triggerLoad(): void {
    this.fileInput()?.nativeElement.click();
  }

  private async registerArchiveImages(
    bytes: Record<string, Uint8Array>,
    asTexture: boolean
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const [oldId, data] of Object.entries(bytes)) {
      const blob = new Blob([data.slice()], { type: 'image/webp' });
      const imageFile = await this.imageStorage.addAsync(blob);
      map.set(oldId, imageFile.identifier);
      if (asTexture && !ImageTag.get(imageFile.identifier)) {
        const tag = ImageTag.create(imageFile.identifier);
        tag.tag = TEXTURE_IMAGE_TAG;
      }
    }
    if (asTexture && map.size > 0) this.objectChange.notifyCollectionChanged('image-tag');
    return map;
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (isZipArchive(buffer)) {
      await this.loadArchive(buffer);
      return;
    }
    const scene = deserializeScene(new TextDecoder().decode(buffer));
    if (!scene) {
      this.flashError(this.t('feature.mapEditor.actions.loadError'));
      return;
    }
    this.state.loadScene(scene);
  }

  private async loadArchive(buffer: Uint8Array): Promise<void> {
    const unpacked = unpackSceneArchive(buffer);
    if (!unpacked) {
      this.flashError(this.t('feature.mapEditor.actions.loadError'));
      return;
    }
    const scene = deserializeScene(unpacked.json);
    if (!scene) {
      this.flashError(this.t('feature.mapEditor.actions.loadError'));
      return;
    }
    const textureMap = await this.registerArchiveImages(unpacked.textures, true);
    const imageMap = await this.registerArchiveImages(unpacked.images, false);
    const remap = new Map<string, string>([...textureMap, ...imageMap]);
    remapSceneImageIdentifiers(scene, remap);
    this.state.loadScene(scene);
  }

  protected async saveImage(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const blob = await this.exportFn(this.state.current, STAMPS, {
        scale: this.exportScale(),
        drawGrid: false,
        resolveImageUrl: (id) => this.imageStorage.get(id)?.url ?? null,
      });
      await this.imageStorage.addAsync(blob);
      this.flashNotice(this.t('feature.mapEditor.actions.savedImage'));
    } catch {
      this.flashError(this.t('feature.mapEditor.actions.exportError'));
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
        drawGrid: false,
        resolveImageUrl: (id) => this.imageStorage.get(id)?.url ?? null,
      });
      const file = await this.imageStorage.addAsync(blob);
      const table = this.tabletopService.currentTable;
      const scene = this.state.current;
      table.imageIdentifier = file.identifier;
      table.width = scene.cols;
      table.height = scene.rows;
      table.gridSize = scene.cellPx;
      table.gridType = scene.gridType;
      this.flashNotice(this.t('feature.mapEditor.actions.setTableDone'));
    } catch {
      this.flashError(this.t('feature.mapEditor.actions.exportError'));
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
