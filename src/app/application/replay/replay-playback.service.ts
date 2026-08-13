import { computed, inject, Injectable, signal } from '@angular/core';
import { prefersReducedMotion } from '@axe/application/effect/effect-playback.service';
import { readKeyframeBytes } from '@axe/application/replay/replay-keyframe-bytes';
import { ReplayLibraryService } from '@axe/application/replay/replay-library.service';
import { ReplayStagingService } from '@axe/application/replay/replay-staging.service';
import { Logger } from '@axe/core/logging/logger';
import { setNetworkIsolated } from '@axe/core/network/network-isolation';
import { localDispatch } from '@axe/core/network/network-messaging';
import type { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { markForChanged } from '@axe/core/sync/object-event-extension';
import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ObjectSynchronizer } from '@axe/core/sync/object-synchronizer';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { CutIn } from '@axe/domain/media/cut-in';
import { collectReplayCast, type ReplayCastMember } from '@axe/domain/replay/replay-cast';
import { mergeSyncData, type SyncData } from '@axe/domain/replay/replay-diff';
import { type ReplayEvent, ReplayEventKind, type ReplayManifest } from '@axe/domain/replay/replay-event';
import {
  decodeReplayKeyframe,
  encodeReplayKeyframe,
  type ReplayObjectSnapshot,
} from '@axe/domain/replay/replay-keyframe';
import { applyReplayEvents, applyReplayPatch, indexOfSeq } from '@axe/domain/replay/replay-patch';
import {
  buildReplayRoute,
  easeInOut,
  pointAlongRoute,
  type ReplayRoutePoint,
  routeLength,
  toRoutePoint,
} from '@axe/domain/replay/replay-route';

export const REPLAY_SLIDE_BASE_MS = 260;
export const REPLAY_SLIDE_PER_PX_MS = 1.4;
export const REPLAY_SLIDE_MAX_MS = 1_600;
export const REPLAY_TRAIL_LINGER_MS = 900;

export interface ReplayRouteTrail {
  identifier: string;
  points: readonly ReplayRoutePoint[];
  progress: number;
}

export const REPLAY_AUTO_PLAY_BASE_MS = 1_200;
export const REPLAY_AUTO_PLAY_MAX_MS = 4_000;
export const REPLAY_AUTO_PLAY_CUT_IN_MS = 5_000;
export const REPLAY_AUTO_PLAY_CUT_IN_MAX_MS = 30_000;
export const REPLAY_AUTO_PLAY_SETTLE_MS = 250;
export const REPLAY_AUTO_PLAY_EFFECT_MS = 900;

@Injectable({ providedIn: 'root' })
export class ReplayPlaybackService {
  private readonly library = inject(ReplayLibraryService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectFactory = inject(ObjectFactory);
  private readonly objectSynchronizer = inject(ObjectSynchronizer);
  private readonly staging = inject(ReplayStagingService);

  private readonly _recordingId = signal<number | null>(null);
  private readonly _manifest = signal<ReplayManifest | null>(null);
  private readonly _events = signal<readonly ReplayEvent[]>([]);
  private readonly _cursor = signal(-1);
  private readonly _isBoardMode = signal(false);
  private readonly _isSeeking = signal(false);
  private readonly _autoPlay = signal(false);
  private readonly _routeTrail = signal<ReplayRouteTrail | null>(null);
  private readonly _cast = signal<readonly ReplayCastMember[]>([]);

  readonly recordingId = this._recordingId.asReadonly();
  readonly manifest = this._manifest.asReadonly();
  readonly events = this._events.asReadonly();
  readonly cursor = this._cursor.asReadonly();
  readonly isBoardMode = this._isBoardMode.asReadonly();
  readonly isSeeking = this._isSeeking.asReadonly();
  readonly autoPlay = this._autoPlay.asReadonly();
  readonly routeTrail = this._routeTrail.asReadonly();
  readonly cast = this._cast.asReadonly();

  readonly isOpen = computed(() => this._recordingId() !== null);
  readonly currentEvent = computed(() => this._events()[this._cursor()] ?? null);
  readonly isAtStart = computed(() => this._cursor() <= 0);
  readonly isAtEnd = computed(() => this._cursor() >= this._events().length - 1);

  private savedBoard: ReplayObjectSnapshot[] | null = null;
  private savedDeleteHistory: Map<string, number> | null = null;
  private baseKeyframe: { seq: number; snapshots: readonly ReplayObjectSnapshot[] } | null = null;
  private autoPlayTimer: ReturnType<typeof setTimeout> | null = null;
  private seekToken = 0;
  private slideFrame: number | null = null;
  private slideEndsAt = 0;

  async open(id: number): Promise<boolean> {
    await this.close();
    const { manifest, events } = await this.library.load(id);
    if (events.length < 1) {
      Logger.warn('[ReplayPlayback] 記録が空でした', id);
      return false;
    }
    this._recordingId.set(id);
    this._manifest.set(manifest);
    this._events.set(events);
    this._cursor.set(0);
    await this.loadCast(id, events);
    return true;
  }

  async close(): Promise<void> {
    this.stopAutoPlay();
    if (this._isBoardMode()) await this.exitBoardMode();
    this.staging.discard();
    this.baseKeyframe = null;
    this._recordingId.set(null);
    this._manifest.set(null);
    this._events.set([]);
    this._cursor.set(-1);
    this._cast.set([]);
  }

  private async loadCast(id: number, events: readonly ReplayEvent[]): Promise<void> {
    try {
      const keyframe = await this.library.keyframeBefore(id, events[0]?.seq ?? 0);
      if (!keyframe) return;
      const snapshots = decodeReplayKeyframe(await readKeyframeBytes(keyframe.blob));
      this._cast.set(collectReplayCast(snapshots));
    } catch (reason) {
      Logger.warn('[ReplayPlayback] 登場人物を読めませんでした', reason);
    }
  }

  async seekTo(index: number): Promise<void> {
    const events = this._events();
    if (events.length < 1) return;
    const clamped = Math.max(0, Math.min(events.length - 1, index));
    const isStepForward = clamped === this._cursor() + 1;
    this._cursor.set(clamped);
    if (!this._isBoardMode()) return;

    if (isStepForward) {
      this.stepBoardForward(events[clamped]);
      return;
    }
    await this.applyBoard(clamped);
  }

  async next(): Promise<void> {
    await this.seekTo(this._cursor() + 1);
  }

  async previous(): Promise<void> {
    await this.seekTo(this._cursor() - 1);
  }

  async toStart(): Promise<void> {
    await this.seekTo(0);
  }

  async toEnd(): Promise<void> {
    await this.seekTo(this._events().length - 1);
  }

  toggleAutoPlay(): void {
    if (this._autoPlay()) {
      this.stopAutoPlay();
      return;
    }
    if (this.isAtEnd()) return;
    this._autoPlay.set(true);
    this.scheduleAutoPlay();
  }

  stopAutoPlay(): void {
    this._autoPlay.set(false);
    if (this.autoPlayTimer === null) return;
    clearTimeout(this.autoPlayTimer);
    this.autoPlayTimer = null;
  }

  async enterBoardMode(): Promise<boolean> {
    if (this._isBoardMode() || !this.isOpen()) return false;
    this.savedBoard = this.snapshotBoard();
    this.savedDeleteHistory = this.objectStore.snapshotDeleteHistory();
    setNetworkIsolated(true);
    this._isBoardMode.set(true);
    await this.applyBoard(this._cursor());
    return true;
  }

  async exitBoardMode(): Promise<void> {
    if (!this._isBoardMode()) return;
    this.staging.discard();
    this.stopAutoPlay();
    this.stopSlide();
    this._isBoardMode.set(false);
    try {
      if (this.savedBoard) this.restoreBoard(this.savedBoard);
    } catch (reason) {
      Logger.warn('[ReplayPlayback] 卓を戻しきれませんでした', reason);
    } finally {
      this.savedBoard = null;
      this.baseKeyframe = null;
      this.objectStore.replaceDeleteHistory(this.savedDeleteHistory ?? new Map());
      this.savedDeleteHistory = null;
      setNetworkIsolated(false);
      this.objectSynchronizer.requestFullSync();
    }
  }

  private scheduleAutoPlay(): void {
    if (this.autoPlayTimer !== null) clearTimeout(this.autoPlayTimer);
    const wait = this.autoPlayWaitFor(this.currentEvent());
    this.autoPlayTimer = setTimeout(() => {
      this.autoPlayTimer = null;
      if (!this._autoPlay()) return;
      if (this.isAtEnd()) {
        this.stopAutoPlay();
        return;
      }
      void this.next().then(() => {
        if (this._autoPlay()) this.scheduleAutoPlay();
      });
    }, wait);
  }

  private autoPlayWaitFor(event: ReplayEvent | null): number {
    const reading = this.readingWaitFor(String(event?.detail['text'] ?? ''));
    if (!event || !this._isBoardMode()) return reading;

    if (event.kind === ReplayEventKind.MediaCutIn && event.detail['isStart'] === true) {
      return Math.max(reading, this.cutInWaitFor(event));
    }
    if (event.kind === ReplayEventKind.EffectCast) {
      return Math.max(reading, this.effectWaitFor(event));
    }
    if (event.kind === ReplayEventKind.VnPlayhead) {
      return this.readingWaitFor(this.playheadText(event));
    }
    if (event.kind === ReplayEventKind.ObjectMove) {
      return Math.max(reading, this.slideRemainingMs() + REPLAY_AUTO_PLAY_SETTLE_MS);
    }
    return reading;
  }

  private readingWaitFor(text: string): number {
    return Math.min(REPLAY_AUTO_PLAY_MAX_MS, REPLAY_AUTO_PLAY_BASE_MS + text.length * 35);
  }

  private playheadText(event: ReplayEvent): string {
    const message = event.targetId ? this.objectStore.get<ChatMessage>(event.targetId) : null;
    return message instanceof ChatMessage ? message.text : '';
  }

  private cutInWaitFor(event: ReplayEvent): number {
    const cutIn = event.targetId ? this.objectStore.get<CutIn>(event.targetId) : null;
    const seconds = Number(cutIn?.outTime ?? 0);
    if (!Number.isFinite(seconds) || seconds <= 0) return REPLAY_AUTO_PLAY_CUT_IN_MS;
    return Math.min(REPLAY_AUTO_PLAY_CUT_IN_MAX_MS, seconds * 1000);
  }

  private effectWaitFor(event: ReplayEvent): number {
    const preset = event.targetId ? this.objectStore.get<EffectPreset>(event.targetId) : null;
    if (!preset) return REPLAY_AUTO_PLAY_EFFECT_MS;

    const targets = Array.isArray(event.detail['targets']) ? event.detail['targets'].length : 1;
    const total = preset.duration + preset.stagger * Math.max(0, targets - 1);
    return Math.min(REPLAY_AUTO_PLAY_CUT_IN_MAX_MS, Math.max(total, REPLAY_AUTO_PLAY_EFFECT_MS));
  }

  private slideRemainingMs(): number {
    return Math.max(0, this.slideEndsAt - performance.now());
  }

  private async applyBoard(index: number): Promise<void> {
    const id = this._recordingId();
    const events = this._events();
    if (id == null || events.length < 1) return;

    const token = ++this.seekToken;
    this._isSeeking.set(true);
    try {
      const targetSeq = events[index].seq;
      const keyframe = await this.library.keyframeBefore(id, targetSeq);
      if (token !== this.seekToken) return;

      const base = await this.baseSnapshotsOf(keyframe);
      if (token !== this.seekToken) return;

      const from = keyframe ? indexOfSeq(events, keyframe.seq) : -1;
      this.stopSlide();
      this.restoreBoard(applyReplayEvents(base, events.slice(from + 1, index + 1)));
    } catch (reason) {
      Logger.warn('[ReplayPlayback] 盤面の再生に失敗しました', reason);
    } finally {
      if (token === this.seekToken) this._isSeeking.set(false);
    }
  }

  private async baseSnapshotsOf(
    keyframe: { seq: number; blob: Blob } | null
  ): Promise<readonly ReplayObjectSnapshot[]> {
    if (!keyframe) return [];
    if (this.baseKeyframe?.seq === keyframe.seq) return this.baseKeyframe.snapshots;
    const snapshots = decodeReplayKeyframe(await readKeyframeBytes(keyframe.blob));
    this.baseKeyframe = { seq: keyframe.seq, snapshots };
    return snapshots;
  }

  private stepBoardForward(event: ReplayEvent): void {
    this.stopSlide();
    if (event.kind === ReplayEventKind.ObjectMove && this.startSlide(event)) {
      if (event.signal) localDispatch(event.signal.name, event.signal.data);
      return;
    }
    if (event.kind === ReplayEventKind.ObjectRemove) {
      const object = event.targetId ? this.objectStore.get(event.targetId) : null;
      if (object) this.objectStore.remove(object);
    } else if (event.patch) {
      const existing = this.objectStore.get(event.patch.identifier);
      if (existing) {
        this.reviveObject(existing, applyReplayPatch(existing.toContext().syncData as SyncData, event.patch));
      } else {
        this.createObject({
          identifier: event.patch.identifier,
          aliasName: event.patch.aliasName,
          syncData: applyReplayPatch(null, event.patch),
        });
      }
    }
    if (event.signal) localDispatch(event.signal.name, event.signal.data);
  }

  private startSlide(event: ReplayEvent): boolean {
    if (!event.patch || prefersReducedMotion()) return false;
    const object = this.objectStore.get(event.patch.identifier);
    if (!object) return false;

    const path = Array.isArray(event.detail['path']) ? (event.detail['path'] as ReplayRoutePoint[]) : [];
    const points = buildReplayRoute(
      toRoutePoint(event.detail['from']),
      path.map(toRoutePoint),
      toRoutePoint(event.detail['to'])
    );
    const length = routeLength(points);
    if (points.length < 2 || length <= 0) return false;

    const syncData = applyReplayPatch(object.toContext().syncData as SyncData, event.patch);
    const duration = Math.min(REPLAY_SLIDE_MAX_MS, REPLAY_SLIDE_BASE_MS + length * REPLAY_SLIDE_PER_PX_MS);
    const startedAt = performance.now();
    this.slideEndsAt = startedAt + duration;

    const tick = (): void => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      const at = pointAlongRoute(points, easeInOut(progress));
      this.reviveObject(object, placeAt(syncData, at));
      this._routeTrail.set({ identifier: object.identifier, points, progress });

      if (progress >= 1) {
        this.slideFrame = null;
        this.reviveObject(object, syncData);
        this.fadeTrail();
        return;
      }
      this.slideFrame = requestAnimationFrame(tick);
    };

    this._routeTrail.set({ identifier: object.identifier, points, progress: 0 });
    this.slideFrame = requestAnimationFrame(tick);
    return true;
  }

  private stopSlide(): void {
    this.slideEndsAt = 0;
    if (this.slideFrame === null) return;
    cancelAnimationFrame(this.slideFrame);
    this.slideFrame = null;
    this._routeTrail.set(null);
  }

  private fadeTrail(): void {
    const shown = this._routeTrail();
    setTimeout(() => {
      if (this._routeTrail() === shown) this._routeTrail.set(null);
    }, REPLAY_TRAIL_LINGER_MS);
  }

  private reviveObject(object: GameObject, syncData: Record<string, unknown>): void {
    // 世代番号しか要らないので toContext() は呼ばない。呼ぶと中身を丸ごと複製して捨てる。
    object.apply({
      aliasName: object.aliasName,
      identifier: object.identifier,
      majorVersion: object.majorVersion + 1,
      minorVersion: 0,
      syncData,
    });
    markForChanged(object);
  }

  private createObject(snapshot: ReplayObjectSnapshot): void {
    const object = this.objectFactory.create(snapshot.aliasName, snapshot.identifier);
    if (!object) return;
    const context: ObjectContext = {
      identifier: snapshot.identifier,
      aliasName: snapshot.aliasName,
      majorVersion: 1,
      minorVersion: 0,
      syncData: mergeSyncData(object.toContext().syncData as SyncData, snapshot.syncData),
    };
    this.objectStore.add(object, false, () => object.apply(context));
  }

  private snapshotBoard(): ReplayObjectSnapshot[] {
    return decodeReplayKeyframe(
      encodeReplayKeyframe(
        this.objectStore.getObjects().map((object) => {
          const context = object.toContext();
          return {
            identifier: context.identifier,
            aliasName: context.aliasName,
            syncData: context.syncData as Record<string, unknown>,
          };
        })
      )
    );
  }

  private restoreBoard(snapshots: readonly ReplayObjectSnapshot[]): void {
    const wanted = new Map(snapshots.map((snapshot) => [snapshot.identifier, snapshot]));
    for (const object of this.objectStore.getObjects()) {
      if (!wanted.has(object.identifier)) this.objectStore.remove(object);
    }
    this.objectStore.clearDeleteHistory();

    for (const snapshot of snapshots) {
      const existing = this.objectStore.get(snapshot.identifier);
      if (existing) this.reviveObject(existing, snapshot.syncData);
      else this.createObject(snapshot);
    }

    for (const object of this.objectStore.getObjects()) markForChanged(object);
  }
}

function placeAt(syncData: Record<string, unknown>, at: ReplayRoutePoint): Record<string, unknown> {
  const attributes = { ...((syncData['attributes'] ?? {}) as Record<string, unknown>) };
  const location = { ...((attributes['location'] ?? {}) as Record<string, unknown>), x: at.x, y: at.y };
  attributes['location'] = location;
  attributes['posZ'] = at.z;
  return { ...syncData, attributes };
}
