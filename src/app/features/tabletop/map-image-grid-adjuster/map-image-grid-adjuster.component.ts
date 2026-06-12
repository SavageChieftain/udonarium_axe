import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ModalService } from '@axe/application/ui/modal.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { computeGridCounts, cropAlignedRegion } from '@axe/features/tabletop/map-image-grid-adjuster/map-image-crop';
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

const MIN_CELL_PX = 4;
const STAGE_MAX_W = 720;
const STAGE_MAX_H = 520;

@Component({
  selector: 'app-map-image-grid-adjuster',
  templateUrl: './map-image-grid-adjuster.component.html',
  host: { class: 'block text-ui-text' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
})
export class MapImageGridAdjusterComponent {
  private readonly modalService = inject(ModalService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly t = inject(TRANSLATE_FN);

  private readonly option = this.readOption();

  readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');

  readonly imageUrl = signal('');
  readonly imageWidth = signal(0);
  readonly imageHeight = signal(0);
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly processing = signal(false);

  readonly gridColor = this.option.gridColor || '#000000e6';

  readonly cellPx = signal(50);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);

  private loadedImage: HTMLImageElement | null = null;
  private dragLast: { x: number; y: number } | null = null;
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

  readonly outputWidth = computed(() => this.cols() * this.cellPx());
  readonly outputHeight = computed(() => this.rows() * this.cellPx());

  readonly displayScale = computed(() => {
    const w = this.imageWidth();
    const h = this.imageHeight();
    if (w <= 0 || h <= 0) return 1;
    return Math.min(STAGE_MAX_W / w, STAGE_MAX_H / h, 1);
  });

  readonly displayWidth = computed(() => this.imageWidth() * this.displayScale());
  readonly displayHeight = computed(() => this.imageHeight() * this.displayScale());

  readonly gridBackgroundSize = computed(() => {
    const size = this.cellPx() * this.displayScale();
    return `${size}px ${size}px`;
  });

  readonly gridBackgroundPosition = computed(() => {
    const x = this.offsetX() * this.displayScale();
    const y = this.offsetY() * this.displayScale();
    return `${x}px ${y}px`;
  });

  readonly gridBackgroundImage = computed(() => {
    const c = this.gridColor;
    return (
      `repeating-linear-gradient(to right, ${c} 0, ${c} 1px, transparent 1px, transparent 100%),` +
      `repeating-linear-gradient(to bottom, ${c} 0, ${c} 1px, transparent 1px, transparent 100%)`
    );
  });

  readonly regionStyle = computed(() => {
    const scale = this.displayScale();
    return {
      left: `${this.offsetX() * scale}px`,
      top: `${this.offsetY() * scale}px`,
      width: `${this.outputWidth() * scale}px`,
      height: `${this.outputHeight() * scale}px`,
    };
  });

  readonly canApply = computed(() => this.loadState() === 'ready' && this.hasWholeCell() && !this.processing());

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.t('feature.tabletop.tableSetting.gridAdjuster.title')));
    this.loadImage();
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
      this.cellPx.set(Math.min(Math.max(MIN_CELL_PX, this.option.gridSize), Math.min(w, h)));
      this.loadState.set('ready');
    };
    image.onabort = image.onerror = () => this.loadState.set('error');
    image.src = url;
  }

  setCellPx(value: number | string) {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num)) return;
    this.cellPx.set(Math.min(this.maxCellPx(), Math.max(MIN_CELL_PX, num)));
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
    this.offsetX.set(0);
    this.offsetY.set(0);
  }

  fit() {
    this.cellPx.set(Math.min(Math.max(MIN_CELL_PX, this.option.gridSize), this.maxCellPx()));
    this.offsetX.set(0);
    this.offsetY.set(0);
  }

  onPointerDown(event: PointerEvent) {
    if (this.loadState() !== 'ready') return;
    this.dragLast = { x: event.clientX, y: event.clientY };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    this.stageRef()?.nativeElement.focus();
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
    const step = event.deltaY < 0 ? 1 : -1;
    this.setCellPx(this.cellPx() + step);
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
        offsetX: this.offsetX(),
        offsetY: this.offsetY(),
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
