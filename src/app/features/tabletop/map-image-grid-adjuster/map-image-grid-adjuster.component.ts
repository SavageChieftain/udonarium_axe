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
import {
  computeGridCounts,
  cropAlignedRegion,
  effectiveOrigin,
} from '@axe/features/tabletop/map-image-grid-adjuster/map-image-crop';
import { TranslocoModule } from '@jsverse/transloco';

export interface MapImageGridAdjusterOption {
  imageIdentifier: string;
  gridSize: number;
  gridColor?: string;
}

export interface MapImageGridAdjusterResult {
  imageIdentifier: string;
  width: number;
  height: number;
}

const MIN_CELL_PX = 8;
const STAGE_FALLBACK_W = 720;
const STAGE_FALLBACK_H = 520;
const MAX_DISPLAY_SCALE = 2;

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
  readonly imageBoxRef = viewChild<ElementRef<HTMLElement>>('imageBox');

  readonly imageUrl = signal('');
  readonly imageWidth = signal(0);
  readonly imageHeight = signal(0);
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly processing = signal(false);

  readonly gridColor = this.option.gridColor || '#000000e6';

  readonly stageW = signal(STAGE_FALLBACK_W);
  readonly stageH = signal(STAGE_FALLBACK_H);

  readonly cellPx = signal(50);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);

  private loadedImage: HTMLImageElement | null = null;
  private dragLast: { x: number; y: number } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly cropFn = cropAlignedRegion;

  readonly maxCellPx = computed(() => {
    const w = this.imageWidth();
    const h = this.imageHeight();
    if (w <= 0 || h <= 0) return MIN_CELL_PX;
    return Math.max(MIN_CELL_PX, Math.min(w, h));
  });

  readonly counts = computed(() =>
    computeGridCounts(this.imageWidth(), this.imageHeight(), this.cellPx(), this.offsetX(), this.offsetY())
  );

  readonly cols = computed(() => this.counts().cols);
  readonly rows = computed(() => this.counts().rows);
  readonly hasWholeCell = computed(() => this.cols() >= 1 && this.rows() >= 1);

  readonly startX = computed(() => effectiveOrigin(this.offsetX(), this.cellPx()));
  readonly startY = computed(() => effectiveOrigin(this.offsetY(), this.cellPx()));

  readonly outputWidth = computed(() => Math.round(this.cols() * this.cellPx()));
  readonly outputHeight = computed(() => Math.round(this.rows() * this.cellPx()));

  readonly cellPxDisplay = computed(() => {
    const v = this.cellPx();
    return Number.isInteger(v) ? v : Math.round(v * 10) / 10;
  });

  readonly displayScale = computed(() => {
    const w = this.imageWidth();
    const h = this.imageHeight();
    if (w <= 0 || h <= 0) return 1;
    return Math.min(this.stageW() / w, this.stageH() / h, MAX_DISPLAY_SCALE);
  });

  readonly displayWidth = computed(() => this.imageWidth() * this.displayScale());
  readonly displayHeight = computed(() => this.imageHeight() * this.displayScale());

  readonly gridBackgroundSize = computed(() => {
    const size = this.cellPx() * this.displayScale();
    return `${size}px ${size}px, ${size}px ${size}px, ${size}px ${size}px, ${size}px ${size}px`;
  });

  readonly gridBackgroundPosition = computed(() => {
    const x = this.offsetX() * this.displayScale();
    const y = this.offsetY() * this.displayScale();
    return `${x}px ${y}px, ${x}px ${y}px, ${x + 1}px ${y + 1}px, ${x + 1}px ${y + 1}px`;
  });

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

  readonly regionStyle = computed(() => {
    const scale = this.displayScale();
    return {
      left: `${this.startX() * scale}px`,
      top: `${this.startY() * scale}px`,
      width: `${this.outputWidth() * scale}px`,
      height: `${this.outputHeight() * scale}px`,
    };
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
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private measureStage(stage: HTMLElement) {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w > 0) this.stageW.set(w);
    if (h > 0) this.stageH.set(h);
  }

  private readOption(): MapImageGridAdjusterOption {
    const option = this.modalService.option as Partial<MapImageGridAdjusterOption> | undefined;
    return {
      imageIdentifier: option?.imageIdentifier ?? '',
      gridSize: Number(option?.gridSize) > 0 ? Number(option?.gridSize) : 50,
      gridColor: option?.gridColor,
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
      this.cellPx.set(this.clampCell(this.option.gridSize));
      this.loadState.set('ready');
    };
    image.onabort = image.onerror = () => this.loadState.set('error');
    image.src = url;
  }

  private clampCell(value: number): number {
    return Math.min(this.maxCellPx(), Math.max(MIN_CELL_PX, value));
  }

  setCols(value: number | string) {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num) || num < 1) return;
    const w = this.imageWidth();
    if (w <= 0) return;
    this.cellPx.set(this.clampCell(w / num));
    this.offsetX.set(0);
    this.offsetY.set(0);
  }

  setRows(value: number | string) {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num) || num < 1) return;
    const h = this.imageHeight();
    if (h <= 0) return;
    this.cellPx.set(this.clampCell(h / num));
    this.offsetX.set(0);
    this.offsetY.set(0);
  }

  setCellPx(value: number | string) {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    this.cellPx.set(this.clampCell(num));
  }

  setOffsetX(value: number | string) {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num)) return;
    this.offsetX.set(num);
  }

  setOffsetY(value: number | string) {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num)) return;
    this.offsetY.set(num);
  }

  reset() {
    this.cellPx.set(this.clampCell(this.option.gridSize));
    this.offsetX.set(0);
    this.offsetY.set(0);
  }

  onPointerDown(event: PointerEvent) {
    if (this.loadState() !== 'ready') return;
    this.dragLast = { x: event.clientX, y: event.clientY };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    this.imageBoxRef()?.nativeElement.focus();
  }

  onPointerMove(event: PointerEvent) {
    if (!this.dragLast) return;
    const scale = this.displayScale();
    if (scale <= 0) return;
    const dx = (event.clientX - this.dragLast.x) / scale;
    const dy = (event.clientY - this.dragLast.y) / scale;
    this.dragLast = { x: event.clientX, y: event.clientY };
    this.offsetX.set(Math.round(this.offsetX() + dx));
    this.offsetY.set(Math.round(this.offsetY() + dy));
  }

  onPointerUp(event: PointerEvent) {
    this.dragLast = null;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  onWheel(event: WheelEvent) {
    if (this.loadState() !== 'ready') return;
    event.preventDefault();
    const dir = event.deltaY < 0 ? 1 : -1;
    const step = event.shiftKey ? 1 : Math.max(1, this.cellPx() * 0.02);
    this.setCellPx(this.cellPx() + dir * step);
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.loadState() !== 'ready') return;
    const step = event.shiftKey ? 10 : 1;
    switch (event.key) {
      case 'ArrowLeft':
        this.offsetX.set(this.offsetX() - step);
        break;
      case 'ArrowRight':
        this.offsetX.set(this.offsetX() + step);
        break;
      case 'ArrowUp':
        this.offsetY.set(this.offsetY() - step);
        break;
      case 'ArrowDown':
        this.offsetY.set(this.offsetY() + step);
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
      const blob = await this.cropFn(this.loadedImage, this.imageWidth(), this.imageHeight(), {
        cellPx: this.cellPx(),
        offsetX: this.startX(),
        offsetY: this.startY(),
        cols: this.cols(),
        rows: this.rows(),
      });
      const image = await this.imageStorage.addAsync(blob);
      const result: MapImageGridAdjusterResult = {
        imageIdentifier: image.identifier,
        width: this.cols(),
        height: this.rows(),
      };
      this.modalService.resolve(result);
    } catch {
      this.processing.set(false);
      this.loadState.set('error');
    }
  }
}
