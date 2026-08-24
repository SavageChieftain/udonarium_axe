import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { CutInScene } from '@axe/domain/media/cut-in-scene';
import { sceneDurationOf } from '@axe/domain/media/cut-in-scene-timeline';
import {
  addLayer,
  duplicateLayer,
  ensureScene,
  removeLayer,
  reorderLayers,
} from '@axe/features/media/cut-in-editor/cut-in-editor-ops';
import { CutInLayerListComponent } from '@axe/features/media/cut-in-editor/cut-in-layer-list.component';
import { CutInLayerPropertiesComponent } from '@axe/features/media/cut-in-editor/cut-in-layer-properties.component';
import {
  applyResize,
  isInsideLayer,
  type LayerBox,
  type ResizeHandle,
  resizeHandleAt,
  stageDeltaToScene,
  stageFit,
  stageToScene,
} from '@axe/features/media/cut-in-editor/cut-in-stage-geometry';
import { CutInStageComponent } from '@axe/features/media/cut-in-stage/cut-in-stage.component';
import type { DropSide } from '@axe/ui/dragging/row-reorder';
import { TranslocoModule } from '@jsverse/transloco';

/** How often a drag reaches the model, which is how often it reaches everyone else. */
const DRAG_FLUSH_MS = 66;

interface Drag {
  layer: CutInLayer;
  handle: ResizeHandle | null;
  fromX: number;
  fromY: number;
  box: LayerBox;
}

/**
 * Building a cut-in out of layers.
 *
 * The stage shows the same component the playing window uses, with the picking and the
 * handles laid over it. A drag writes to the model on a timer rather than on every
 * move, the way a piece being pushed around the table does, so a drag does not put sixty
 * messages a second onto the wire.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cut-in-scene-editor',
  templateUrl: './cut-in-scene-editor.component.html',
  host: { class: 'block' },
  imports: [FormsModule, TranslocoModule, CutInStageComponent, CutInLayerListComponent, CutInLayerPropertiesComponent],
})
export class CutInSceneEditorComponent {
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly t = inject(TRANSLATE_FN);

  readonly cutIn = input<CutIn | null>(null);
  readonly isEditable = input(false);

  private readonly stageArea = viewChild<ElementRef<HTMLElement>>('stageArea');

  protected readonly selectedIdentifier = signal<string>('');
  protected readonly playing = signal(false);
  protected readonly playheadMs = signal(0);
  private readonly stageSize = signal({ width: 0, height: 0 });
  private readonly bumped = signal(0);

  private drag: Drag | null = null;
  private pending: { layer: CutInLayer; box: LayerBox } | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  readonly scene = computed<CutInScene | null>(() => {
    const cutIn = this.cutIn();
    if (!cutIn) return null;
    this.objectChange.collectionOf(CutInScene.aliasName)();
    this.bumped();
    return cutIn.scene;
  });

  readonly layers = computed<CutInLayer[]>(() => {
    const scene = this.scene();
    if (!scene) return [];
    this.objectChange.versionOf(scene.identifier)();
    this.objectChange.collectionOf(CutInLayer.aliasName)();
    this.bumped();
    return scene.layers;
  });

  readonly selected = computed<CutInLayer | null>(() => {
    const identifier = this.selectedIdentifier();
    return this.layers().find((layer) => layer.identifier === identifier) ?? null;
  });

  readonly sceneWidth = computed(() => this.watchCutIn()?.width ?? 0);
  readonly sceneHeight = computed(() => this.watchCutIn()?.height ?? 0);

  readonly durationMs = computed(() => {
    const scene = this.scene();
    if (!scene) return 0;
    this.objectChange.versionOf(scene.identifier)();
    for (const layer of this.layers()) this.objectChange.versionOf(layer.identifier)();
    return sceneDurationOf(scene);
  });

  /** Where the scene sits inside the room the stage has, so a pointer can be read back. */
  readonly fit = computed(() => stageFit({ width: this.sceneWidth(), height: this.sceneHeight() }, this.stageSize()));

  readonly selectionBox = computed<LayerBox | null>(() => {
    const layer = this.selected();
    if (!layer) return null;
    this.objectChange.versionOf(layer.identifier)();
    this.bumped();
    return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
  });

  constructor() {
    afterNextRender(() => this.watchStageSize());
    this.destroyRef.onDestroy(() => this.flushDrag());
  }

  protected addImageLayer(): void {
    const cutIn = this.cutIn();
    if (!cutIn || !this.isEditable()) return;

    const scene = ensureScene(cutIn);
    const layer = addLayer(scene, 'image', this.t('feature.media.cutInEditor.newImageLayer'), {
      width: cutIn.width,
      height: cutIn.height,
    });
    // A cut-in built out of layers is no longer the size of one picture.
    cutIn.originalSize = false;
    this.selectedIdentifier.set(layer.identifier);
    this.changed();
  }

  protected duplicateSelected(): void {
    const scene = this.scene();
    const layer = this.selected();
    if (!scene || !layer || !this.isEditable()) return;

    const copy = duplicateLayer(scene, layer);
    if (copy) this.selectedIdentifier.set(copy.identifier);
    this.changed();
  }

  protected removeSelected(): void {
    const scene = this.scene();
    const layer = this.selected();
    if (!scene || !layer || !this.isEditable()) return;

    removeLayer(scene, layer);
    this.selectedIdentifier.set('');
    this.changed();
  }

  protected onSelect(layer: CutInLayer): void {
    this.selectedIdentifier.set(layer.identifier);
  }

  protected onToggleHidden(layer: CutInLayer): void {
    if (!this.isEditable()) return;
    layer.hidden = !layer.hidden;
    this.changed();
  }

  protected onToggleLocked(layer: CutInLayer): void {
    if (!this.isEditable()) return;
    layer.locked = !layer.locked;
    this.changed();
  }

  protected onReorder(dropped: { held: CutInLayer; over: CutInLayer; side: DropSide | null }): void {
    const scene = this.scene();
    if (!scene || !this.isEditable()) return;

    reorderLayers(scene, dropped.held, dropped.over, dropped.side);
    this.changed();
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.isEditable()) return;

    const point = this.pointAt(event);
    const layer = this.layerAt(point);
    if (!layer) {
      this.selectedIdentifier.set('');
      return;
    }

    this.selectedIdentifier.set(layer.identifier);
    (event.target as HTMLElement | null)?.setPointerCapture?.(event.pointerId);

    const box = { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
    this.drag = {
      layer,
      handle: resizeHandleAt(point, box, this.fit()),
      fromX: event.clientX,
      fromY: event.clientY,
      box,
    };
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;

    const moved = stageDeltaToScene(event.clientX - drag.fromX, event.clientY - drag.fromY, this.fit());
    const box = drag.handle
      ? applyResize(drag.box, drag.handle, moved.x, moved.y, event.shiftKey)
      : { ...drag.box, x: drag.box.x + moved.x, y: drag.box.y + moved.y };

    this.queueFlush(drag.layer, box);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.drag) return;
    (event.target as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);

    this.onPointerMove(event);
    this.flushDrag();
    this.drag = null;
    this.changed();
  }

  protected togglePlaying(): void {
    this.playing.update((playing) => !playing);
  }

  protected stop(): void {
    this.playing.set(false);
    this.playheadMs.set(0);
  }

  protected get sceneDurationSeconds(): number {
    return Math.round(this.durationMs() / 100) / 10;
  }
  protected set sceneDurationSeconds(seconds: number) {
    const scene = this.scene();
    if (!scene || !this.isEditable()) return;
    scene.durationMs = Math.max(100, Math.round((Number(seconds) || 0) * 1000));
    this.changed();
  }

  protected get sceneLoop(): boolean {
    return this.scene()?.sceneLoop ?? false;
  }
  protected set sceneLoop(sceneLoop: boolean) {
    const scene = this.scene();
    if (!scene || !this.isEditable()) return;
    scene.sceneLoop = sceneLoop;
    this.changed();
  }

  /** Something changed. Redraws what reads from the model, and later feeds the undo stack. */
  protected changed(): void {
    this.bumped.update((count) => count + 1);
  }

  private watchCutIn(): CutIn | null {
    const cutIn = this.cutIn();
    if (cutIn) this.objectChange.versionOf(cutIn.identifier)();
    return cutIn;
  }

  private pointAt(event: PointerEvent): { x: number; y: number } {
    const bounds = this.stageArea()?.nativeElement.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return stageToScene(event.clientX - bounds.left, event.clientY - bounds.top, this.fit());
  }

  /** The topmost layer under the pointer, which is the last one drawn. */
  private layerAt(point: { x: number; y: number }): CutInLayer | null {
    const layers = this.layers();
    for (let at = layers.length - 1; at >= 0; at--) {
      const layer = layers[at];
      if (layer.hidden || layer.locked) continue;
      const box = { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
      if (resizeHandleAt(point, box, this.fit()) || isInsideLayer(point, box)) return layer;
    }
    return null;
  }

  private queueFlush(layer: CutInLayer, box: LayerBox): void {
    this.pending = { layer, box };
    if (this.flushTimer !== null) return;

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushDrag();
    }, DRAG_FLUSH_MS);
  }

  private flushDrag(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const pending = this.pending;
    this.pending = null;
    if (!pending) return;

    pending.layer.x = Math.round(pending.box.x);
    pending.layer.y = Math.round(pending.box.y);
    pending.layer.width = Math.round(pending.box.width);
    pending.layer.height = Math.round(pending.box.height);
    this.changed();
  }

  private watchStageSize(): void {
    if (typeof ResizeObserver !== 'function') return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      this.stageSize.set({ width: Math.round(rect.width), height: Math.round(rect.height) });
    });

    const element = this.stageArea()?.nativeElement;
    if (element) observer.observe(element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
