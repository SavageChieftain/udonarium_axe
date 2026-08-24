import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import type { CutInSound } from '@axe/domain/media/cut-in-sound';
import { layerKeyTimes } from '@axe/features/media/cut-in-editor/cut-in-keyframe-edit';
import {
  barRect,
  formatMs,
  keyAtX,
  msToX,
  pxPerSecFor,
  snapMs,
  type TimelineTick,
  visibleTicks,
  xToMs,
} from '@axe/features/media/cut-in-editor/cut-in-timeline-geometry';
import { TranslocoModule } from '@jsverse/transloco';

export interface TimelineRow {
  layer: CutInLayer;
  left: number;
  width: number;
  keys: { ms: number; x: number }[];
}

interface KeyDrag {
  layer: CutInLayer;
  fromMs: number;
  toMs: number;
}

/** The clock of a scene: what each layer is doing, and when. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cut-in-timeline',
  templateUrl: './cut-in-timeline.component.html',
  host: { class: 'block' },
  imports: [TranslocoModule],
})
export class CutInTimelineComponent {
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly layers = input<readonly CutInLayer[]>([]);
  readonly sounds = input<readonly CutInSound[]>([]);
  readonly selected = input<CutInLayer | null>(null);
  readonly durationMs = input(0);
  readonly playheadMs = input(0);
  readonly isEditable = input(false);

  readonly seek = output<number>();
  readonly selectLayer = output<CutInLayer>();
  readonly moveKey = output<{ layer: CutInLayer; fromMs: number; toMs: number }>();
  readonly removeKey = output<{ layer: CutInLayer; ms: number }>();
  readonly moveSound = output<{ fromMs: number; toMs: number }>();
  readonly removeSound = output<{ ms: number }>();

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly trackWidth = signal(0);
  private scrubbing = false;
  private keyDrag: KeyDrag | null = null;
  private soundDrag: { fromMs: number; toMs: number } | null = null;

  readonly pxPerSec = computed(() => pxPerSecFor(this.durationMs(), this.trackWidth()));

  readonly ticks = computed<TimelineTick[]>(() => visibleTicks(this.durationMs(), this.pxPerSec()));

  /** Topmost first, the way the layer list reads. */
  readonly rows = computed<TimelineRow[]>(() => {
    const pxPerSec = this.pxPerSec();
    const durationMs = this.durationMs();

    return [...this.layers()].reverse().map((layer) => {
      this.objectChange.versionOf(layer.identifier)();
      const bar = barRect(layer, durationMs, pxPerSec);
      return {
        layer,
        left: bar.left,
        width: bar.width,
        keys: layerKeyTimes(layer).map((ms) => ({ ms, x: msToX(ms, pxPerSec) })),
      };
    });
  });

  readonly soundMarks = computed(() =>
    this.sounds().map((sound) => ({ ms: sound.t, x: msToX(sound.t, this.pxPerSec()) }))
  );

  readonly playheadX = computed(() => msToX(this.playheadMs(), this.pxPerSec()));

  readonly clock = computed(() => `${formatMs(this.playheadMs())} / ${formatMs(this.durationMs())}`);

  constructor() {
    afterNextRender(() => this.watchTrackWidth());
  }

  protected tickX(tick: TimelineTick): number {
    return msToX(tick.ms, this.pxPerSec());
  }

  protected tickLabel(tick: TimelineTick): string {
    return `${Math.round(tick.ms / 100) / 10}`;
  }

  protected isSelected(row: TimelineRow): boolean {
    return this.selected()?.identifier === row.layer.identifier;
  }

  protected onRulerDown(event: PointerEvent): void {
    (event.target as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    this.scrubbing = true;
    this.seek.emit(this.momentAt(event));
  }

  protected onRowDown(event: PointerEvent, row: TimelineRow): void {
    this.selectLayer.emit(row.layer);

    const grabbed = this.isEditable()
      ? keyAtX(
          row.keys.map((key) => key.ms),
          this.offsetOf(event),
          this.pxPerSec()
        )
      : null;
    if (grabbed === null) {
      this.onRulerDown(event);
      return;
    }

    (event.target as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    this.keyDrag = { layer: row.layer, fromMs: grabbed, toMs: grabbed };
  }

  protected onSoundRowDown(event: PointerEvent): void {
    const grabbed = this.isEditable()
      ? keyAtX(
          this.soundMarks().map((mark) => mark.ms),
          this.offsetOf(event),
          this.pxPerSec()
        )
      : null;
    if (grabbed === null) {
      this.onRulerDown(event);
      return;
    }

    (event.target as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    this.soundDrag = { fromMs: grabbed, toMs: grabbed };
  }

  protected onSoundRowDoubleClick(event: MouseEvent): void {
    if (!this.isEditable()) return;

    const at = keyAtX(
      this.soundMarks().map((mark) => mark.ms),
      this.offsetOf(event),
      this.pxPerSec()
    );
    if (at === null) return;
    this.removeSound.emit({ ms: at });
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.soundDrag) {
      this.soundDrag.toMs = this.momentAt(event);
      return;
    }
    if (this.keyDrag) {
      this.keyDrag.toMs = this.momentAt(event);
      return;
    }
    if (this.scrubbing) this.seek.emit(this.momentAt(event));
  }

  protected onPointerUp(event: PointerEvent): void {
    (event.target as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
    this.scrubbing = false;

    const draggedSound = this.soundDrag;
    this.soundDrag = null;
    if (draggedSound && draggedSound.toMs !== draggedSound.fromMs) {
      this.moveSound.emit(draggedSound);
      return;
    }

    const dragged = this.keyDrag;
    this.keyDrag = null;
    if (!dragged || dragged.toMs === dragged.fromMs) return;

    this.moveKey.emit({ layer: dragged.layer, fromMs: dragged.fromMs, toMs: dragged.toMs });
  }

  protected onRowDoubleClick(event: MouseEvent, row: TimelineRow): void {
    if (!this.isEditable()) return;

    const at = keyAtX(
      row.keys.map((key) => key.ms),
      this.offsetOf(event),
      this.pxPerSec()
    );
    if (at === null) return;
    this.removeKey.emit({ layer: row.layer, ms: at });
  }

  private momentAt(event: MouseEvent): number {
    return snapMs(xToMs(this.offsetOf(event), this.pxPerSec()), this.durationMs());
  }

  private offsetOf(event: MouseEvent): number {
    const bounds = this.track()?.nativeElement.getBoundingClientRect();
    return bounds ? event.clientX - bounds.left : event.clientX;
  }

  private watchTrackWidth(): void {
    const element = this.track()?.nativeElement;
    if (!element) return;

    this.trackWidth.set(Math.round(element.getBoundingClientRect().width));
    if (typeof ResizeObserver !== 'function') return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) this.trackWidth.set(Math.round(rect.width));
    });
    observer.observe(element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
