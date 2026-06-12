import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ModalService } from '@axe/application/ui/modal.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { GridType } from '@axe/domain/tabletop/game-table';
import { isHexGrid } from '@axe/domain/tabletop/hex-geometry';
import { GridLineRender } from '@axe/features/tabletop/game-table/grid-line-render';
import {
  computeCoveredRegion,
  cropImageRegion,
  scaleForCols,
  scaleForRows,
  snapAnchor,
} from '@axe/features/tabletop/map-image-grid-adjuster/map-image-grid-region';
import { TranslocoModule } from '@jsverse/transloco';

export interface MapImageGridAdjusterOption {
  imageIdentifier: string;
  gridSize: number;
  gridColor?: string;
  fitWidth?: boolean;
  gridType?: GridType;
}

export interface MapImageGridAdjusterResult {
  imageIdentifier: string;
  width: number;
  height: number;
  gridType: GridType;
}

const DISPLAY_CELL = 48;
const STAGE_FALLBACK_W = 720;
const STAGE_FALLBACK_H = 520;
const MAX_SCALE = 8;

@Component({
  selector: 'app-map-image-grid-adjuster',
  templateUrl: './map-image-grid-adjuster.component.html',
  host: { class: 'block text-ui-text' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
})
export class MapImageGridAdjusterComponent implements OnDestroy {
  private readonly modalService = inject(ModalService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly t = inject(TRANSLATE_FN);

  private readonly option = this.readOption();

  readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  readonly hexCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('hexGrid');

  readonly imageUrl = signal('');
  readonly imageWidth = signal(0);
  readonly imageHeight = signal(0);
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly processing = signal(false);

  readonly gridColor = this.option.gridColor || '#000000e6';

  readonly stageW = signal(STAGE_FALLBACK_W);
  readonly stageH = signal(STAGE_FALLBACK_H);

  readonly tx = signal(0);
  readonly ty = signal(0);
  readonly scale = signal(1);
  readonly gridType = signal<GridType>(this.option.gridType ?? GridType.SQUARE);

  private loadedImage: HTMLImageElement | null = null;
  private dragLast: { x: number; y: number } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly cropFn = cropImageRegion;

  readonly minScale = computed(() => {
    const w = this.imageWidth();
    const h = this.imageHeight();
    if (w <= 0 || h <= 0) return 0.05;
    return Math.max(0.05, DISPLAY_CELL / Math.min(w, h));
  });

  readonly imageScreenWidth = computed(() => this.imageWidth() * this.scale());
  readonly imageScreenHeight = computed(() => this.imageHeight() * this.scale());

  readonly covered = computed(() =>
    computeCoveredRegion(
      this.gridType(),
      this.tx(),
      this.ty(),
      this.scale(),
      this.imageWidth(),
      this.imageHeight(),
      DISPLAY_CELL
    )
  );

  private readonly regionVisible = computed(() => {
    const c = this.covered();
    if (c.cols < 1 || c.rows < 1) return false;
    const right = c.screenX + c.screenW;
    const bottom = c.screenY + c.screenH;
    return c.screenX < this.stageW() && c.screenY < this.stageH() && right > 0 && bottom > 0;
  });

  readonly cols = computed(() => this.covered().cols);
  readonly rows = computed(() => this.covered().rows);
  readonly hasWholeCell = computed(() => this.cols() >= 1 && this.rows() >= 1 && this.regionVisible());

  readonly outputWidth = computed(() => Math.round(this.covered().imageW));
  readonly outputHeight = computed(() => Math.round(this.covered().imageH));

  readonly zoomPercent = computed(() => Math.round(this.scale() * 100));
  readonly minZoomPercent = computed(() => Math.round(this.minScale() * 100));
  readonly maxZoomPercent = MAX_SCALE * 100;

  readonly regionStyle = computed(() => {
    const c = this.covered();
    return {
      left: `${c.screenX}px`,
      top: `${c.screenY}px`,
      width: `${c.screenW}px`,
      height: `${c.screenH}px`,
    };
  });

  readonly gridBackgroundSize = `${DISPLAY_CELL}px ${DISPLAY_CELL}px, ${DISPLAY_CELL}px ${DISPLAY_CELL}px, ${DISPLAY_CELL}px ${DISPLAY_CELL}px, ${DISPLAY_CELL}px ${DISPLAY_CELL}px`;
  readonly gridBackgroundPosition = '0px 0px, 0px 0px, 1px 1px, 1px 1px';

  readonly gridBackgroundImage = computed(() => {
    const c = this.gridColor;
    const w = 'rgba(255,255,255,0.55)';
    return (
      `repeating-linear-gradient(to right, ${c} 0, ${c} 1px, transparent 1px, transparent 100%),` +
      `repeating-linear-gradient(to bottom, ${c} 0, ${c} 1px, transparent 1px, transparent 100%),` +
      `repeating-linear-gradient(to right, ${w} 0, ${w} 1px, transparent 1px, transparent 100%),` +
      `repeating-linear-gradient(to bottom, ${w} 0, ${w} 1px, transparent 1px, transparent 100%)`
    );
  });

  readonly canApply = computed(() => this.loadState() === 'ready' && this.hasWholeCell() && !this.processing());

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.t('feature.tabletop.tableSetting.gridAdjuster.title')));
    this.loadImage();
    effect((onCleanup) => {
      if (this.loadState() !== 'ready') return;
      const stage = this.stageRef()?.nativeElement;
      if (!stage) return;
      this.measureStage(stage);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.measureStage(stage));
      observer.observe(stage);
      this.resizeObserver = observer;
      onCleanup(() => {
        observer.disconnect();
        this.resizeObserver = null;
      });
    });
    effect(() => this.renderHexOverlay());
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private renderHexOverlay() {
    const type = this.gridType();
    const w = this.stageW();
    const h = this.stageH();
    if (this.loadState() !== 'ready' || !isHexGrid(type)) return;
    const canvas = this.hexCanvasRef()?.nativeElement;
    if (!canvas || typeof canvas.getContext !== 'function') return;
    if (!canvas.getContext('2d')) return;
    new GridLineRender(canvas).renderViewport(w, h, DISPLAY_CELL, type, this.gridColor, 'transparent', 0, 0);
  }

  private measureStage(stage: HTMLElement) {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w > 0) this.stageW.set(w);
    if (h > 0) this.stageH.set(h);
  }

  private readOption(): MapImageGridAdjusterOption {
    const option = this.modalService.option as Partial<MapImageGridAdjusterOption> | undefined;
    const rawType = option?.gridType;
    const gridType =
      rawType === GridType.HEX_VERTICAL || rawType === GridType.HEX_HORIZONTAL ? rawType : GridType.SQUARE;
    return {
      imageIdentifier: option?.imageIdentifier ?? '',
      gridSize: Number(option?.gridSize) > 0 ? Number(option?.gridSize) : 50,
      gridColor: option?.gridColor,
      fitWidth: option?.fitWidth,
      gridType,
    };
  }

  private loadImage() {
    const file = this.imageStorage.get(this.option.imageIdentifier);
    const url = file?.url ?? '';
    if (!url) {
      this.loadState.set('error');
      return;
    }
    this.imageUrl.set(url);

    if (typeof Image === 'undefined') {
      this.loadState.set('error');
      return;
    }
    const image = new Image();
    image.onload = () => {
      const w = image.naturalWidth || image.width;
      const h = image.naturalHeight || image.height;
      if (w <= 0 || h <= 0) {
        this.loadState.set('error');
        return;
      }
      this.loadedImage = image;
      this.imageWidth.set(w);
      this.imageHeight.set(h);
      this.initTransform();
      this.loadState.set('ready');
    };
    image.onabort = image.onerror = () => this.loadState.set('error');
    image.src = url;
  }

  private clampScale(value: number): number {
    return Math.min(MAX_SCALE, Math.max(this.minScale(), value));
  }

  private initTransform() {
    const s = this.clampScale(DISPLAY_CELL / this.option.gridSize);
    this.scale.set(s);
    this.centerAndSnap();
  }

  private centerImage() {
    const s = this.scale();
    this.tx.set((this.stageW() - this.imageWidth() * s) / 2);
    this.ty.set((this.stageH() - this.imageHeight() * s) / 2);
  }

  private centerAndSnap() {
    this.centerImage();
    const a = snapAnchor(this.gridType(), this.tx(), this.ty(), DISPLAY_CELL);
    this.tx.set(a.tx);
    this.ty.set(a.ty);
  }

  protected zoomAt(px: number, py: number, factor: number) {
    const s = this.scale();
    const next = this.clampScale(s * factor);
    if (next === s) return;
    this.tx.set(px - (px - this.tx()) * (next / s));
    this.ty.set(py - (py - this.ty()) * (next / s));
    this.scale.set(next);
  }

  setGridType(type: GridType) {
    if (type === this.gridType()) return;
    this.gridType.set(type);
    const a = snapAnchor(type, this.tx(), this.ty(), DISPLAY_CELL);
    this.tx.set(a.tx);
    this.ty.set(a.ty);
  }

  setCols(value: number | string) {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num) || num < 1) return;
    const w = this.imageWidth();
    if (w <= 0) return;
    this.scale.set(this.clampScale(scaleForCols(this.gridType(), num, w, DISPLAY_CELL)));
    this.centerAndSnap();
  }

  setRows(value: number | string) {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num) || num < 1) return;
    const h = this.imageHeight();
    if (h <= 0) return;
    this.scale.set(this.clampScale(scaleForRows(this.gridType(), num, h, DISPLAY_CELL)));
    this.centerAndSnap();
  }

  setZoom(value: number | string) {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    this.zoomAt(this.stageW() / 2, this.stageH() / 2, this.clampScale(num / 100) / this.scale());
  }

  reset() {
    this.scale.set(this.clampScale(DISPLAY_CELL / this.option.gridSize));
    this.centerAndSnap();
  }

  onPointerDown(event: PointerEvent) {
    if (this.loadState() !== 'ready') return;
    this.dragLast = { x: event.clientX, y: event.clientY };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    (event.currentTarget as HTMLElement).focus();
  }

  onPointerMove(event: PointerEvent) {
    if (!this.dragLast) return;
    const dx = event.clientX - this.dragLast.x;
    const dy = event.clientY - this.dragLast.y;
    this.dragLast = { x: event.clientX, y: event.clientY };
    this.tx.set(this.tx() + dx);
    this.ty.set(this.ty() + dy);
  }

  onPointerUp(event: PointerEvent) {
    this.dragLast = null;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  onWheel(event: WheelEvent) {
    if (this.loadState() !== 'ready') return;
    event.preventDefault();
    const stage = this.stageRef()?.nativeElement;
    const rect = stage?.getBoundingClientRect();
    const px = rect ? event.clientX - rect.left : this.stageW() / 2;
    const py = rect ? event.clientY - rect.top : this.stageH() / 2;
    const base = event.shiftKey ? 1.01 : 1.05;
    const factor = event.deltaY < 0 ? base : 1 / base;
    this.zoomAt(px, py, factor);
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.loadState() !== 'ready') return;
    const step = event.shiftKey ? 10 : 1;
    switch (event.key) {
      case 'ArrowLeft':
        this.tx.set(this.tx() - step);
        break;
      case 'ArrowRight':
        this.tx.set(this.tx() + step);
        break;
      case 'ArrowUp':
        this.ty.set(this.ty() - step);
        break;
      case 'ArrowDown':
        this.ty.set(this.ty() + step);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  cancel() {
    this.modalService.resolve(null);
  }

  async apply() {
    if (!this.canApply() || !this.loadedImage) return;
    this.processing.set(true);
    try {
      const c = this.covered();
      const blob = await this.cropFn(this.loadedImage, c.imageX, c.imageY, c.imageW, c.imageH);
      const image = await this.imageStorage.addAsync(blob);
      const result: MapImageGridAdjusterResult = {
        imageIdentifier: image.identifier,
        width: c.cols,
        height: c.rows,
        gridType: this.gridType(),
      };
      this.modalService.resolve(result);
    } catch {
      this.processing.set(false);
      this.loadState.set('error');
    }
  }
}
