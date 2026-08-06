import { computed, inject, Injectable, signal } from '@angular/core';
import { ReplayLibraryService } from '@axe/application/replay/replay-library.service';
import { Logger } from '@axe/core/logging/logger';
import { setNetworkIsolated } from '@axe/core/network/network-isolation';
import type { ObjectContext } from '@axe/core/sync/game-object';
import { markForChanged } from '@axe/core/sync/object-event-extension';
import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ObjectSynchronizer } from '@axe/core/sync/object-synchronizer';
import type { ReplayEvent, ReplayManifest } from '@axe/domain/replay/replay-event';
import {
  decodeReplayKeyframe,
  encodeReplayKeyframe,
  type ReplayObjectSnapshot,
} from '@axe/domain/replay/replay-keyframe';
import { applyReplayEvents, indexOfSeq } from '@axe/domain/replay/replay-patch';

export const REPLAY_AUTO_PLAY_BASE_MS = 1_200;
export const REPLAY_AUTO_PLAY_MAX_MS = 4_000;

@Injectable({ providedIn: 'root' })
export class ReplayPlaybackService {
  private readonly library = inject(ReplayLibraryService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectFactory = inject(ObjectFactory);
  private readonly objectSynchronizer = inject(ObjectSynchronizer);

  private readonly _recordingId = signal<number | null>(null);
  private readonly _manifest = signal<ReplayManifest | null>(null);
  private readonly _events = signal<readonly ReplayEvent[]>([]);
  private readonly _cursor = signal(-1);
  private readonly _isBoardMode = signal(false);
  private readonly _isSeeking = signal(false);
  private readonly _autoPlay = signal(false);

  readonly recordingId = this._recordingId.asReadonly();
  readonly manifest = this._manifest.asReadonly();
  readonly events = this._events.asReadonly();
  readonly cursor = this._cursor.asReadonly();
  readonly isBoardMode = this._isBoardMode.asReadonly();
  readonly isSeeking = this._isSeeking.asReadonly();
  readonly autoPlay = this._autoPlay.asReadonly();

  readonly isOpen = computed(() => this._recordingId() !== null);
  readonly currentEvent = computed(() => this._events()[this._cursor()] ?? null);
  readonly isAtStart = computed(() => this._cursor() <= 0);
  readonly isAtEnd = computed(() => this._cursor() >= this._events().length - 1);

  private savedBoard: ReplayObjectSnapshot[] | null = null;
  private autoPlayTimer: ReturnType<typeof setTimeout> | null = null;
  private seekToken = 0;

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
    return true;
  }

  async close(): Promise<void> {
    this.stopAutoPlay();
    if (this._isBoardMode()) await this.exitBoardMode();
    this._recordingId.set(null);
    this._manifest.set(null);
    this._events.set([]);
    this._cursor.set(-1);
  }

  async seekTo(index: number): Promise<void> {
    const events = this._events();
    if (events.length < 1) return;
    const clamped = Math.max(0, Math.min(events.length - 1, index));
    this._cursor.set(clamped);
    if (this._isBoardMode()) await this.applyBoard(clamped);
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
    setNetworkIsolated(true);
    this._isBoardMode.set(true);
    await this.applyBoard(this._cursor());
    return true;
  }

  async exitBoardMode(): Promise<void> {
    if (!this._isBoardMode()) return;
    this.stopAutoPlay();
    this._isBoardMode.set(false);
    if (this.savedBoard) this.restoreBoard(this.savedBoard);
    this.savedBoard = null;
    setNetworkIsolated(false);
    this.objectSynchronizer.requestFullSync();
  }

  private scheduleAutoPlay(): void {
    if (this.autoPlayTimer !== null) clearTimeout(this.autoPlayTimer);
    const text = String(this.currentEvent()?.detail['text'] ?? '');
    const wait = Math.min(REPLAY_AUTO_PLAY_MAX_MS, REPLAY_AUTO_PLAY_BASE_MS + text.length * 35);
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

      const base = keyframe ? decodeReplayKeyframe(new Uint8Array(await keyframe.blob.arrayBuffer())) : [];
      if (token !== this.seekToken) return;

      const from = keyframe ? indexOfSeq(events, keyframe.seq) : -1;
      this.restoreBoard(applyReplayEvents(base, events.slice(from + 1, index + 1)));
    } catch (reason) {
      Logger.warn('[ReplayPlayback] 盤面の再生に失敗しました', reason);
    } finally {
      if (token === this.seekToken) this._isSeeking.set(false);
    }
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
    for (const object of this.objectStore.getObjects()) this.objectStore.remove(object);
    this.objectStore.clearDeleteHistory();

    for (const snapshot of snapshots) {
      const object = this.objectFactory.create(snapshot.aliasName, snapshot.identifier);
      if (!object) continue;
      const context: ObjectContext = {
        identifier: snapshot.identifier,
        aliasName: snapshot.aliasName,
        majorVersion: 1,
        minorVersion: 0,
        syncData: snapshot.syncData,
      };
      this.objectStore.add(object, false, () => object.apply(context));
    }

    for (const object of this.objectStore.getObjects()) markForChanged(object);
  }
}
