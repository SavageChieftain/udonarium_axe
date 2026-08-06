import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { Logger } from '@axe/core/logging/logger';
import { Network } from '@axe/core/network/network';
import { networkMessage$ } from '@axe/core/network/network-messaging';
import { ReplayLogStore, type ReplayRecordingMeta, selectExpiredRecordings } from '@axe/core/storage/replay-log-store';
import type { ObjectContext } from '@axe/core/sync/game-object';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';
import { DisclosureMode } from '@axe/domain/disclosure/disclosure';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { canMergeReplayEvents, mergeReplayEvents } from '@axe/domain/replay/replay-coalescer';
import { encodeReplayEvents, encodeReplayManifest } from '@axe/domain/replay/replay-codec';
import { cloneSyncData, type SyncData } from '@axe/domain/replay/replay-diff';
import {
  GM_ONLY_VISIBILITY,
  PUBLIC_VISIBILITY,
  REPLAY_FORMAT_VERSION,
  type ReplayActorSnapshot,
  ReplayDetailLevel,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayManifest,
  type ReplayTargetSnapshot,
  type ReplayVisibility,
} from '@axe/domain/replay/replay-event';
import {
  interpretObjectChange,
  interpretObjectRemove,
  interpretSignal,
  isIgnoredReplayEvent,
  isRecordableKind,
  type ReplayDraft,
} from '@axe/domain/replay/replay-interpreter';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export const REPLAY_CHUNK_EVENT_LIMIT = 500;
export const REPLAY_CHUNK_INTERVAL_MS = 30_000;
export const REPLAY_KEYFRAME_INTERVAL_MS = 600_000;
export const REPLAY_BASELINE_GRACE_MS = 5_000;
export const REPLAY_RECENT_EVENT_LIMIT = 300;

@Injectable({ providedIn: 'root' })
export class ReplayRecorderService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(ReplayLogStore);
  private readonly objectStore = inject(ObjectStore);
  private readonly saveDataService = inject(SaveDataService);

  private readonly _isRecording = signal(false);
  private readonly _eventCount = signal(0);
  private readonly _startedAt = signal(0);
  private readonly _recentEvents = signal<readonly ReplayEvent[]>([]);
  private readonly _detailLevel = signal<ReplayDetailLevel>(ReplayDetailLevel.Notable);
  private readonly _recordings = signal<readonly ReplayRecordingMeta[]>([]);

  readonly isRecording = this._isRecording.asReadonly();
  readonly eventCount = this._eventCount.asReadonly();
  readonly startedAt = this._startedAt.asReadonly();
  readonly recentEvents = this._recentEvents.asReadonly();
  readonly detailLevel = this._detailLevel.asReadonly();
  readonly recordings = this._recordings.asReadonly();

  private recordingId: number | null = null;
  private seq = 0;
  private chunkIndex = 0;
  private buffer: ReplayEvent[] = [];
  private pending: ReplayEvent | null = null;
  private readonly shadows = new Map<string, SyncData>();
  private readonly actors = new Map<string, ReplayActorSnapshot[]>();
  private readonly targets = new Map<string, ReplayTargetSnapshot[]>();
  private readonly keyframes: ReplayManifest['keyframes'][number][] = [];
  private readonly chunks: ReplayManifest['chunks'][number][] = [];
  private baselineUntil = 0;
  private chunkTimer: ReturnType<typeof setTimeout> | null = null;
  private keyframeTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    networkMessage$.subscribe((message) => {
      if (!this._isRecording()) return;
      this.handleMessage(message.eventName, message.data, message.sendFrom);
    }, this.destroyRef);
    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  get isSupported(): boolean {
    return this.store.isAvailable();
  }

  async refresh(): Promise<readonly ReplayRecordingMeta[]> {
    if (!this.isSupported) return [];
    const metas = await this.store.listRecordings();
    this._recordings.set(metas);
    return metas;
  }

  setDetailLevel(level: ReplayDetailLevel): void {
    this._detailLevel.set(level);
  }

  async start(): Promise<boolean> {
    if (!this.isSupported || this._isRecording()) return false;

    const startedAt = Date.now();
    const id = await this.store.createRecording({ roomName: currentRoomName(), startedAt });
    if (id == null) {
      Logger.warn('[ReplayRecorder] 録画を開始できませんでした');
      return false;
    }

    this.recordingId = id;
    this.seq = 0;
    this.chunkIndex = 0;
    this.buffer = [];
    this.pending = null;
    this.shadows.clear();
    this.actors.clear();
    this.targets.clear();
    this.keyframes.length = 0;
    this.chunks.length = 0;
    this._eventCount.set(0);
    this._recentEvents.set([]);
    this._startedAt.set(startedAt);
    this.seedShadows();
    this.baselineUntil = startedAt + REPLAY_BASELINE_GRACE_MS;
    this._isRecording.set(true);

    await this.captureKeyframe();
    this.keyframeTimer = setInterval(() => void this.captureKeyframe(), REPLAY_KEYFRAME_INTERVAL_MS);
    await this.prune();
    await this.refresh();
    return true;
  }

  async stop(): Promise<void> {
    if (!this._isRecording()) return;
    this._isRecording.set(false);
    this.clearTimers();
    this.flushPending();
    await this.captureKeyframe();
    await this.flushBuffer();
    const id = this.recordingId;
    if (id != null) {
      await this.store.updateRecording(id, { endedAt: Date.now(), manifest: encodeReplayManifest(this.manifest()) });
    }
    this.recordingId = null;
    await this.refresh();
  }

  async mark(label: string): Promise<void> {
    if (!this._isRecording()) return;
    this.push({ kind: ReplayEventKind.Marker, detail: { label } }, this.selfPeerId(), Date.now());
    await this.captureKeyframe();
  }

  async remove(id: number): Promise<void> {
    if (!this.isSupported || id === this.recordingId) return;
    await this.store.removeRecording(id);
    await this.refresh();
  }

  private handleMessage(eventName: string, data: unknown, sendFrom: string): void {
    if (isIgnoredReplayEvent(eventName)) return;
    const at = Date.now();

    if (eventName === 'UPDATE_GAME_OBJECT') {
      this.handleObjectUpdate(data as ObjectContext, sendFrom, at);
      return;
    }
    if (eventName === 'DELETE_GAME_OBJECT') {
      const context = data as { identifier: string; aliasName: string };
      this.shadows.delete(context.identifier);
      this.push(interpretObjectRemove(context.identifier, context.aliasName), sendFrom, at);
      return;
    }

    const draft = interpretSignal(eventName, data);
    if (draft) this.push(draft, sendFrom, at);
  }

  private handleObjectUpdate(context: ObjectContext, sendFrom: string, at: number): void {
    if (!context?.identifier) return;
    const after = context.syncData as SyncData;
    const before = this.shadows.get(context.identifier) ?? null;
    this.shadows.set(context.identifier, cloneSyncData(after));

    if (!before && at < this.baselineUntil) return;

    const draft = interpretObjectChange({
      aliasName: context.aliasName,
      identifier: context.identifier,
      before,
      after,
    });
    if (draft) this.push(draft, sendFrom, at);
  }

  private push(draft: ReplayDraft, sendFrom: string, at: number): void {
    if (!isRecordableKind(draft.kind, this._detailLevel())) return;

    const actor = this.rememberActor(sendFrom);
    if (draft.targetIdentifier) this.rememberTarget(draft.targetIdentifier);

    const event: ReplayEvent = {
      seq: ++this.seq,
      at,
      t: at - this._startedAt(),
      kind: draft.kind,
      actorId: actor.userId,
      targetId: draft.targetIdentifier,
      detail: draft.detail,
      patch: draft.patch,
      visibility: this.visibilityOf(draft),
    };

    if (this.pending && canMergeReplayEvents(this.pending, event)) {
      this.seq--;
      this.pending = mergeReplayEvents(this.pending, event);
      this.publishRecent(this.pending, true);
      return;
    }

    this.flushPending();
    this.pending = event;
    this.publishRecent(event, false);
    if (this.buffer.length + 1 >= REPLAY_CHUNK_EVENT_LIMIT) this.flushPending();
    this.scheduleChunkFlush();
  }

  private flushPending(): void {
    if (!this.pending) return;
    this.buffer.push(this.pending);
    this.pending = null;
    this._eventCount.update((count) => count + 1);
    if (this.buffer.length >= REPLAY_CHUNK_EVENT_LIMIT) void this.flushBuffer();
  }

  private scheduleChunkFlush(): void {
    if (this.chunkTimer !== null) return;
    this.chunkTimer = setTimeout(() => {
      this.chunkTimer = null;
      this.flushPending();
      void this.flushBuffer();
    }, REPLAY_CHUNK_INTERVAL_MS);
  }

  private async flushBuffer(): Promise<void> {
    const id = this.recordingId;
    if (id == null || this.buffer.length < 1) return;

    const events = this.buffer;
    this.buffer = [];
    const bytes = encodeReplayEvents(events);
    const chunk = {
      index: this.chunkIndex++,
      seqStart: events[0].seq,
      seqEnd: events[events.length - 1].seq,
      eventCount: events.length,
      byteSize: bytes.byteLength,
    };
    this.chunks.push(chunk);
    await this.store.appendChunk({ recordingId: id, ...chunk, bytes });
  }

  private async captureKeyframe(): Promise<void> {
    const id = this.recordingId;
    if (id == null) return;
    try {
      const blob = await this.saveDataService.createRoomStateArchiveAsync();
      const at = Date.now();
      await this.store.putKeyframe({ recordingId: id, seq: this.seq, at, blob });
      this.keyframes.push({ seq: this.seq, at, byteSize: blob.size });
    } catch (reason) {
      Logger.warn('[ReplayRecorder] 盤面の記録に失敗しました', reason);
    }
  }

  private seedShadows(): void {
    for (const object of this.objectStore.getObjects()) {
      this.shadows.set(object.identifier, cloneSyncData(object.toContext().syncData as SyncData));
    }
  }

  private publishRecent(event: ReplayEvent, replaceLast: boolean): void {
    this._recentEvents.update((events) => {
      const next = replaceLast ? events.slice(0, -1) : events.slice();
      next.push(event);
      return next.length > REPLAY_RECENT_EVENT_LIMIT ? next.slice(next.length - REPLAY_RECENT_EVENT_LIMIT) : next;
    });
  }

  private rememberActor(peerId: string): ReplayActorSnapshot {
    const cursor = PeerCursor.findByPeerId(peerId);
    const snapshot: ReplayActorSnapshot = {
      userId: cursor?.userId || peerId,
      peerId,
      name: cursor?.name ?? '',
      role: cursor?.role ?? 'pl',
      imageIdentifier: cursor?.imageIdentifier ?? '',
      sinceSeq: this.seq + 1,
    };
    const history = this.actors.get(snapshot.userId);
    if (!history) {
      this.actors.set(snapshot.userId, [snapshot]);
      return snapshot;
    }
    const latest = history[history.length - 1];
    if (
      latest.name !== snapshot.name ||
      latest.role !== snapshot.role ||
      latest.imageIdentifier !== snapshot.imageIdentifier
    ) {
      history.push(snapshot);
      return snapshot;
    }
    return latest;
  }

  private rememberTarget(identifier: string): void {
    const object = this.objectStore.get(identifier);
    if (!object) return;

    const owner = ownerOf(object);
    const snapshot: ReplayTargetSnapshot = {
      identifier,
      aliasName: object.aliasName,
      name: nameOf(object),
      ownerIdentifier: owner?.identifier,
      sinceSeq: this.seq + 1,
    };
    const history = this.targets.get(identifier);
    if (!history) {
      this.targets.set(identifier, [snapshot]);
      return;
    }
    const latest = history[history.length - 1];
    if (latest.name !== snapshot.name || latest.ownerIdentifier !== snapshot.ownerIdentifier) history.push(snapshot);
  }

  private visibilityOf(draft: ReplayDraft): ReplayVisibility {
    if (draft.kind === ReplayEventKind.ChatMessage || draft.kind === ReplayEventKind.ChatDice) {
      const to = String(draft.detail['to'] ?? '')
        .trim()
        .split(/\s+/)
        .filter((userId) => userId.length > 0);
      if (to.length > 0) return { kind: 'direct', to };
      if (String(draft.detail['tag'] ?? '').includes('secret')) return GM_ONLY_VISIBILITY;
      return PUBLIC_VISIBILITY;
    }

    const object = draft.targetIdentifier ? this.objectStore.get(draft.targetIdentifier) : null;
    const disclosable = object as { disclosureMode?: unknown; disclosureUserIds?: unknown } | null;
    if (disclosable?.disclosureMode === DisclosureMode.GameMaster) return GM_ONLY_VISIBILITY;
    if (disclosable?.disclosureMode === DisclosureMode.Selected && Array.isArray(disclosable.disclosureUserIds))
      return { kind: 'direct', to: [...(disclosable.disclosureUserIds as string[])] };
    return PUBLIC_VISIBILITY;
  }

  private manifest(): ReplayManifest {
    const self = this.rememberActor(this.selfPeerId());
    return {
      formatVersion: REPLAY_FORMAT_VERSION,
      roomName: currentRoomName(),
      startedAt: this._startedAt(),
      endedAt: Date.now(),
      recordedBy: self,
      detailLevel: this._detailLevel(),
      actors: [...this.actors.values()].flat(),
      targets: [...this.targets.values()].flat(),
      keyframes: [...this.keyframes],
      chunks: [...this.chunks],
    };
  }

  private selfPeerId(): string {
    return Network.peerId;
  }

  private async prune(): Promise<void> {
    const expired = selectExpiredRecordings(await this.store.listRecordings(), undefined, this.recordingId);
    for (const id of expired) await this.store.removeRecording(id);
  }

  private clearTimers(): void {
    if (this.chunkTimer !== null) clearTimeout(this.chunkTimer);
    if (this.keyframeTimer !== null) clearInterval(this.keyframeTimer);
    this.chunkTimer = null;
    this.keyframeTimer = null;
  }
}

function currentRoomName(): string {
  return Network.peerContext?.roomName ?? '';
}

function ownerOf(object: unknown): ObjectNode | null {
  if (!(object instanceof ObjectNode)) return null;
  for (let current = object.parent; current; current = current.parent) {
    if (current instanceof TabletopObject) return current;
  }
  return null;
}

function nameOf(object: unknown): string {
  if (object instanceof TabletopObject) return object.name;
  if (object instanceof DataElement) return String(object.getAttribute('name') ?? '');
  const named = object as { name?: unknown };
  return typeof named?.name === 'string' ? named.name : '';
}
