import { computed, inject, Injectable, signal } from '@angular/core';
import { Logger } from '@axe/core/logging/logger';
import { ReplayLogStore } from '@axe/core/storage/replay-log-store';
import { encodeReplayEvents, encodeReplayManifest } from '@axe/domain/replay/replay-codec';
import {
  hasReplayEdits,
  moveReplayEvent,
  removeReplayEvent,
  resequenceReplayEvents,
  retextReplayEvent,
} from '@axe/domain/replay/replay-edit';
import { REPLAY_FORMAT_VERSION, type ReplayEvent, type ReplayManifest } from '@axe/domain/replay/replay-event';
import { encodeReplayKeyframe, type ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';
import { applyReplayEvents } from '@axe/domain/replay/replay-patch';

export const REPLAY_DERIVED_CHUNK_SIZE = 500;
export const REPLAY_DERIVED_KEYFRAME_STRIDE = 200;

@Injectable({ providedIn: 'root' })
export class ReplayEditorService {
  private readonly store = inject(ReplayLogStore);

  private readonly _original = signal<readonly ReplayEvent[]>([]);
  private readonly _edited = signal<readonly ReplayEvent[]>([]);
  private readonly _isEditing = signal(false);
  private readonly _isSaving = signal(false);

  readonly edited = this._edited.asReadonly();
  readonly isEditing = this._isEditing.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly isDirty = computed(() => hasReplayEdits(this._original(), this._edited()));

  begin(events: readonly ReplayEvent[]): void {
    this._original.set([...events]);
    this._edited.set([...events]);
    this._isEditing.set(true);
  }

  cancel(): void {
    this._edited.set([...this._original()]);
    this._isEditing.set(false);
  }

  revert(): void {
    this._edited.set([...this._original()]);
  }

  remove(seq: number): void {
    this._edited.update((events) => removeReplayEvent(events, seq));
  }

  move(seq: number, offset: number): void {
    this._edited.update((events) => moveReplayEvent(events, seq, offset));
  }

  retext(seq: number, text: string): void {
    this._edited.update((events) => retextReplayEvent(events, seq, text));
  }

  async saveAsDerived(source: ReplayManifest, base: readonly ReplayObjectSnapshot[]): Promise<number | null> {
    if (this._isSaving()) return null;
    this._isSaving.set(true);
    try {
      const events = resequenceReplayEvents(this._edited());
      if (events.length < 1) return null;

      const id = await this.store.createRecording({ roomName: source.roomName, startedAt: source.startedAt });
      if (id == null) {
        Logger.warn('[ReplayEditor] 派生した記録を作れませんでした');
        return null;
      }

      const keyframes = await this.writeKeyframes(id, base, events);
      const chunks = await this.writeChunks(id, events);

      const manifest: ReplayManifest = {
        ...source,
        formatVersion: REPLAY_FORMAT_VERSION,
        endedAt: events[events.length - 1].at,
        derivedFrom: { roomName: source.roomName, startedAt: source.startedAt },
        keyframes,
        chunks,
      };
      await this.store.updateRecording(id, { endedAt: manifest.endedAt, manifest: encodeReplayManifest(manifest) });

      this._original.set([...this._edited()]);
      this._isEditing.set(false);
      return id;
    } catch (reason) {
      Logger.warn('[ReplayEditor] 派生した記録の保存に失敗しました', reason);
      return null;
    } finally {
      this._isSaving.set(false);
    }
  }

  private async writeKeyframes(
    id: number,
    base: readonly ReplayObjectSnapshot[],
    events: readonly ReplayEvent[]
  ): Promise<ReplayManifest['keyframes']> {
    const written: ReplayManifest['keyframes'][number][] = [];
    let board = [...base];
    let applied = 0;

    const put = async (seq: number, at: number): Promise<void> => {
      const bytes = encodeReplayKeyframe(board);
      const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
      await this.store.putKeyframe({ recordingId: id, seq, at, blob });
      written.push({ seq, at, byteSize: blob.size });
    };

    await put(0, events[0].at);
    while (applied < events.length) {
      const slice = events.slice(applied, applied + REPLAY_DERIVED_KEYFRAME_STRIDE);
      board = applyReplayEvents(board, slice);
      applied += slice.length;
      if (applied < events.length) await put(events[applied - 1].seq, events[applied - 1].at);
    }
    return written;
  }

  private async writeChunks(id: number, events: readonly ReplayEvent[]): Promise<ReplayManifest['chunks']> {
    const written: ReplayManifest['chunks'][number][] = [];
    for (let offset = 0; offset < events.length; offset += REPLAY_DERIVED_CHUNK_SIZE) {
      const slice = events.slice(offset, offset + REPLAY_DERIVED_CHUNK_SIZE);
      const bytes = encodeReplayEvents(slice);
      const chunk = {
        index: written.length,
        seqStart: slice[0].seq,
        seqEnd: slice[slice.length - 1].seq,
        eventCount: slice.length,
        byteSize: bytes.byteLength,
      };
      written.push(chunk);
      await this.store.appendChunk({ recordingId: id, ...chunk, bytes });
    }
    return written;
  }
}
