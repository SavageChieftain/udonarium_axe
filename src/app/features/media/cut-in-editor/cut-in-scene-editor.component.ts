import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { CutInSoundService } from '@axe/application/media/cut-in-sound.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { EditHistory } from '@axe/core/util/edit-history';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLayer, type CutInLayerKind } from '@axe/domain/media/cut-in-layer';
import { CutInScene } from '@axe/domain/media/cut-in-scene';
import {
  cloneSceneSnapshot,
  type CutInSceneSnapshot,
  restoreScene,
  snapshotScene,
} from '@axe/domain/media/cut-in-scene-snapshot';
import { sceneDurationOf } from '@axe/domain/media/cut-in-scene-timeline';
import {
  DEFAULT_SOUND_VOLUME,
  encodeCutInSounds,
  moveSound,
  removeSoundAt,
  upsertSound,
} from '@axe/domain/media/cut-in-sound';
import { CutInBgmComponent } from '@axe/features/media/cut-in-bgm/cut-in-bgm.component';
import {
  addLayer,
  duplicateLayer,
  ensureScene,
  removeLayer,
  reorderLayers,
} from '@axe/features/media/cut-in-editor/cut-in-editor-ops';
import {
  type CutInEditorCommand,
  cutInEditorKeyDown,
  isTypingTarget,
} from '@axe/features/media/cut-in-editor/cut-in-editor-shortcut';
import {
  moveLayerKeys,
  removeLayerKeys,
  setValueAt,
  valueAt,
} from '@axe/features/media/cut-in-editor/cut-in-keyframe-edit';
import { CutInLayerListComponent } from '@axe/features/media/cut-in-editor/cut-in-layer-list.component';
import { CutInLayerPropertiesComponent } from '@axe/features/media/cut-in-editor/cut-in-layer-properties.component';
import {
  angleFromCentre,
  applyResize,
  fromLayerLocal,
  isInsideLayer,
  isOnRotateHandle,
  type LayerBox,
  type LayerTransform,
  normaliseAngle,
  type ResizeHandle,
  resizeHandleAt,
  rotateGripAt,
  stageDeltaToScene,
  stageFit,
  stageToScene,
  toLayerLocal,
  toLayerLocalDelta,
} from '@axe/features/media/cut-in-editor/cut-in-stage-geometry';
import { CutInTimelineComponent } from '@axe/features/media/cut-in-editor/cut-in-timeline.component';
import { formatMs, TIMELINE_HEAD_OFFSET_PX } from '@axe/features/media/cut-in-editor/cut-in-timeline-geometry';
import { CutInStageComponent } from '@axe/features/media/cut-in-stage/cut-in-stage.component';
import type { DropSide } from '@axe/ui/dragging/row-reorder';
import { TranslocoModule } from '@jsverse/transloco';

/** How often a drag reaches the model, which is how often it reaches everyone else. */
const DRAG_FLUSH_MS = 66;

interface Drag {
  layer: CutInLayer;
  handle: ResizeHandle | null;
  /** Set while the grip above the box is being dragged round. */
  turningFrom: number | null;
  fromX: number;
  fromY: number;
  box: LayerBox;
  transform: LayerTransform;
  rotation: number;
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
  imports: [
    FormsModule,
    TranslocoModule,
    CutInStageComponent,
    CutInLayerListComponent,
    CutInLayerPropertiesComponent,
    CutInTimelineComponent,
  ],
})
export class CutInSceneEditorComponent {
  private readonly objectChange = inject(ObjectChangeService);
  private readonly cutInSound = inject(CutInSoundService);
  private readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly t = inject(TRANSLATE_FN);

  readonly cutIn = input<CutIn | null>(null);
  readonly isEditable = input(false);

  private readonly stageArea = viewChild<ElementRef<HTMLElement>>('stageArea');

  protected readonly selectedIdentifier = signal<string>('');
  protected readonly playing = signal(false);
  protected readonly playheadMs = signal(0);

  /** The heads beside the timeline start below its ruler and its sound row. */
  protected readonly timelineHeadOffsetPx = TIMELINE_HEAD_OFFSET_PX;
  protected readonly clock = computed(() => `${formatMs(this.playheadMs())} / ${formatMs(this.durationMs())}`);
  private readonly stageSize = signal({ width: 0, height: 0 });
  private readonly bumped = signal(0);

  private drag: Drag | null = null;
  private clockId: number | null = null;
  private history: EditHistory<CutInSceneSnapshot> | null = null;
  private historyOf = '';
  protected readonly historyVersion = signal(0);
  private pending: { layer: CutInLayer; box: LayerBox | null; rotation: number | null } | null = null;
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

  readonly sounds = computed(() => {
    const scene = this.scene();
    if (!scene) return [];
    this.objectChange.versionOf(scene.identifier)();
    this.bumped();
    return scene.soundList;
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
    return this.boxOf(layer);
  });

  /** How the selected layer is turned and grown, so the outline sits on it rather than beside it. */
  readonly selectionTransform = computed(() => {
    const layer = this.selected();
    if (!layer) return 'none';
    this.objectChange.versionOf(layer.identifier)();
    this.bumped();

    const transform = this.transformOf(layer);
    const lean =
      transform.skewXDeg !== 0 || transform.skewYDeg !== 0
        ? ` skew(${transform.skewXDeg}deg, ${transform.skewYDeg}deg)`
        : '';
    return `rotate(${transform.rotationDeg}deg) scale(${transform.scaleX}, ${transform.scaleY})${lean}`;
  });

  /**
   * Where the grip that turns the layer is drawn.
   *
   * It is placed on the stage rather than inside the outline, so that turning and growing
   * the layer move it without also stretching it. Where it is drawn is then exactly where
   * the pointer is looked for.
   */
  readonly rotateGrip = computed<{ left: number; top: number } | null>(() => {
    const layer = this.selected();
    const box = this.selectionBox();
    if (!layer || !box) return null;

    const fit = this.fit();
    const transform = this.transformOf(layer);
    const drawn = fromLayerLocal(rotateGripAt(box, fit, transform), box, transform);
    return { left: fit.offsetX + drawn.x * fit.scale, top: fit.offsetY + drawn.y * fit.scale };
  });

  readonly selectionOrigin = computed(() => {
    const layer = this.selected();
    if (!layer) return '50% 50%';
    return `${layer.anchorX * 100}% ${layer.anchorY * 100}%`;
  });

  constructor() {
    // The stack is started from the scene as it stands, before anything is changed, so the
    // very first change has something to be taken back to.
    effect(() => {
      const cutIn = this.cutIn();
      this.historyOf = cutIn?.identifier ?? '';
      this.history = cutIn ? new EditHistory(snapshotScene(cutIn.scene), cloneSceneSnapshot) : null;
      this.selectedIdentifier.set('');
      this.historyVersion.update((count) => count + 1);
    });

    afterNextRender(() => this.watchStageSize());
    this.destroyRef.onDestroy(() => {
      this.flushDrag();
      this.pause();
    });
  }

  protected addImageLayer(): void {
    this.addLayerOfKind('image', 'newImageLayer');
  }

  protected addTextLayer(): void {
    this.addLayerOfKind('text', 'newTextLayer');
  }

  protected addFillLayer(): void {
    this.addLayerOfKind('fill', 'newFillLayer');
  }

  private addLayerOfKind(kind: CutInLayerKind, nameKey: string): void {
    const cutIn = this.cutIn();
    if (!cutIn || !this.isEditable()) return;

    const scene = ensureScene(cutIn);
    const layer = addLayer(scene, kind, this.t(`feature.media.cutInEditor.${nameKey}`), {
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

    const box = this.boxOf(layer);
    const transform = this.transformOf(layer);
    const local = toLayerLocal(point, box, transform);
    const turning = isOnRotateHandle(local, box, this.fit(), undefined, transform);

    this.drag = {
      layer,
      handle: turning ? null : resizeHandleAt(local, box, this.fit(), undefined, transform),
      // The angle is read in the stage's own frame, which is the frame the pointer travels in.
      turningFrom: turning ? angleFromCentre(point, box, transform) : null,
      fromX: event.clientX,
      fromY: event.clientY,
      box,
      transform,
      rotation: transform.rotationDeg,
    };
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.drag) return;

    // A pointer that has already been let go of, or one taken away by something the
    // browser started, leaves no release behind. Anything still held then would follow
    // the pointer about for good, so the drag is closed off the moment that shows.
    if (event.buttons === 0) {
      this.finishDrag();
      return;
    }

    this.applyMove(event);
  }

  private applyMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;

    if (drag.turningFrom !== null) {
      const turned = angleFromCentre(this.pointAt(event), drag.box, drag.transform) - drag.turningFrom;
      // Holding shift snaps to the eighths of a turn, for a level or a quarter-turned layer.
      this.queueTurn(drag.layer, normaliseAngle(drag.rotation + turned, event.shiftKey ? 45 : 0));
      return;
    }

    const moved = stageDeltaToScene(event.clientX - drag.fromX, event.clientY - drag.fromY, this.fit());
    // Moving happens in the stage's frame; resizing happens along the layer's own edges.
    const alongEdges = toLayerLocalDelta(moved, drag.transform);
    const box = drag.handle
      ? applyResize(drag.box, drag.handle, alongEdges.x, alongEdges.y, event.shiftKey)
      : { ...drag.box, x: drag.box.x + moved.x, y: drag.box.y + moved.y };

    this.queueFlush(drag.layer, box);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.drag) return;
    (event.target as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);

    if (event.type === 'pointerup') this.applyMove(event);
    this.finishDrag();
  }

  /** Writes down where the drag got to and lets go of it. */
  private finishDrag(): void {
    if (!this.drag) return;

    this.drag = null;
    this.flushDrag();
    this.changed();
  }

  protected togglePlaying(): void {
    if (this.playing()) {
      this.pause();
      return;
    }
    this.start();
  }

  protected stop(): void {
    this.pause();
    this.playheadMs.set(0);
  }

  protected onSeek(ms: number): void {
    this.pause();
    this.playheadMs.set(ms);
  }

  protected onMoveKey(moved: { layer: CutInLayer; fromMs: number; toMs: number }): void {
    if (!this.isEditable()) return;
    if (moveLayerKeys(moved.layer, moved.fromMs, moved.toMs)) this.changed();
  }

  protected onRemoveKey(removed: { layer: CutInLayer; ms: number }): void {
    if (!this.isEditable()) return;
    if (removeLayerKeys(removed.layer, removed.ms)) this.changed();
  }

  protected onMoveSound(moved: { fromMs: number; toMs: number }): void {
    const scene = this.scene();
    if (!scene || !this.isEditable()) return;

    scene.sounds = encodeCutInSounds(moveSound(scene.soundList, moved.fromMs, moved.toMs));
    this.changed();
  }

  protected onRemoveSound(removed: { ms: number }): void {
    const scene = this.scene();
    if (!scene || !this.isEditable()) return;

    scene.sounds = encodeCutInSounds(removeSoundAt(scene.soundList, removed.ms));
    this.changed();
  }

  /** Drops a sound at the scrubber, chosen from what the room has. */
  protected addSound(): void {
    const cutIn = this.cutIn();
    if (!cutIn || !this.isEditable()) return;

    this.modalService.open<string>(CutInBgmComponent).then((identifier) => {
      if (!identifier) return;

      const scene = ensureScene(cutIn);
      scene.sounds = encodeCutInSounds(
        upsertSound(scene.soundList, { t: this.playheadMs(), a: identifier, v: DEFAULT_SOUND_VOLUME })
      );
      this.changed();
    });
  }

  /**
   * The editor runs the clock itself rather than letting the animations run.
   *
   * Holding every layer at the moment the scrubber names is the only way the picture and
   * the playhead can be trusted to agree, which is what an editor is for.
   */
  private start(): void {
    const durationMs = this.durationMs();
    if (durationMs < 1) return;

    this.playing.set(true);
    const from = this.playheadMs() >= durationMs ? 0 : this.playheadMs();
    const startedAt = performance.now() - from;
    this.cutInSound.play(this.scene(), from, this.sceneLoop);

    const step = () => {
      if (!this.playing()) return;
      const running = Math.max(1, this.durationMs());
      const at = performance.now() - startedAt;

      if (at < running) {
        this.playheadMs.set(at);
      } else if (this.sceneLoop) {
        this.playheadMs.set(at % running);
      } else {
        this.playheadMs.set(running);
        this.pause();
        return;
      }
      this.clockId = requestAnimationFrame(step);
    };
    this.clockId = requestAnimationFrame(step);
  }

  private pause(): void {
    this.playing.set(false);
    this.cutInSound.stop();
    if (this.clockId !== null) {
      cancelAnimationFrame(this.clockId);
      this.clockId = null;
    }
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

  /** Something changed: what reads from the model is redrawn, and the change can be taken back. */
  protected changed(): void {
    this.bumped.update((count) => count + 1);
    this.stack()?.commit(snapshotScene(this.scene()));
    this.historyVersion.update((count) => count + 1);
  }

  protected canUndo(): boolean {
    this.historyVersion();
    return this.stack()?.canUndo() ?? false;
  }

  protected canRedo(): boolean {
    this.historyVersion();
    return this.stack()?.canRedo() ?? false;
  }

  protected undo(): void {
    this.stepHistory((stack) => stack.undo());
  }

  protected redo(): void {
    this.stepHistory((stack) => stack.redo());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const action = cutInEditorKeyDown(event.key, {
      typing: isTypingTarget(event.target),
      chord: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
      hasSelection: this.selected() !== null,
    });
    if (!action) return;
    if (action.preventDefault) event.preventDefault();

    this.run(action.command);
  }

  private run(command: CutInEditorCommand): void {
    if (command === 'undo') this.undo();
    else if (command === 'redo') this.redo();
    else if (command === 'deleteSelection') this.removeSelected();
    else if (command === 'togglePlaying') this.togglePlaying();
  }

  private stepHistory(step: (stack: EditHistory<CutInSceneSnapshot>) => CutInSceneSnapshot | null): void {
    const stack = this.stack();
    const scene = this.scene();
    if (!stack || !scene || !this.isEditable()) return;

    const wanted = step(stack);
    if (!wanted) return;

    restoreScene(scene, wanted);
    this.bumped.update((count) => count + 1);
    this.historyVersion.update((count) => count + 1);
    if (!this.layers().some((layer) => layer.identifier === this.selectedIdentifier())) {
      this.selectedIdentifier.set('');
    }
  }

  /** The stack for the cut-in being edited. */
  private stack(): EditHistory<CutInSceneSnapshot> | null {
    return this.historyOf === (this.cutIn()?.identifier ?? '') ? this.history : null;
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

  /** Where a layer stands at the scrubber, which is where it is grabbed. */
  private boxOf(layer: CutInLayer): LayerBox {
    const ms = this.playheadMs();
    return {
      x: valueAt(layer, 'x', ms),
      y: valueAt(layer, 'y', ms),
      width: layer.width,
      height: layer.height,
    };
  }

  /** How a layer is turned and grown at the scrubber, which is how it is drawn. */
  private transformOf(layer: CutInLayer): LayerTransform {
    const ms = this.playheadMs();
    return {
      rotationDeg: valueAt(layer, 'rotation', ms),
      scaleX: valueAt(layer, 'scaleX', ms),
      scaleY: valueAt(layer, 'scaleY', ms),
      skewXDeg: layer.skewXDeg,
      skewYDeg: layer.skewYDeg,
      anchorX: layer.anchorX,
      anchorY: layer.anchorY,
    };
  }

  /** The topmost layer under the pointer, which is the last one drawn. */
  private layerAt(point: { x: number; y: number }): CutInLayer | null {
    const layers = this.layers();
    for (let at = layers.length - 1; at >= 0; at--) {
      const layer = layers[at];
      if (layer.hidden || layer.locked) continue;

      const box = this.boxOf(layer);
      const transform = this.transformOf(layer);
      const local = toLayerLocal(point, box, transform);

      if (isOnRotateHandle(local, box, this.fit(), undefined, transform)) return layer;
      if (resizeHandleAt(local, box, this.fit(), undefined, transform) || isInsideLayer(local, box)) return layer;
    }
    return null;
  }

  private queueTurn(layer: CutInLayer, rotation: number): void {
    this.pending = { layer, box: null, rotation };
    this.startFlushTimer();
  }

  private queueFlush(layer: CutInLayer, box: LayerBox): void {
    this.pending = { layer, box, rotation: null };
    this.startFlushTimer();
  }

  private startFlushTimer(): void {
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

    if (pending.rotation !== null) {
      setValueAt(pending.layer, 'rotation', this.playheadMs(), pending.rotation);
    }
    if (pending.box) {
      setValueAt(pending.layer, 'x', this.playheadMs(), Math.round(pending.box.x));
      setValueAt(pending.layer, 'y', this.playheadMs(), Math.round(pending.box.y));
      pending.layer.width = Math.round(pending.box.width);
      pending.layer.height = Math.round(pending.box.height);
    }
    // Only the redraw: the whole drag is one change to take back, committed on the release.
    this.bumped.update((count) => count + 1);
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
