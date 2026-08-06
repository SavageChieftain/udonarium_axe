import { inject, Injectable, signal } from '@angular/core';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { Logger } from '@axe/core/logging/logger';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ReplayLogStore, type ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { downloadBlob } from '@axe/core/util/download-blob';
import {
  buildReplayArchiveFiles,
  parseReplayArchive,
  REPLAY_ARCHIVE_EXTENSION,
  type ReplayArchiveContent,
  replayArchiveName,
} from '@axe/domain/replay/replay-archive';
import {
  decodeReplayEvents,
  decodeReplayManifest,
  encodeReplayEvents,
  encodeReplayManifest,
} from '@axe/domain/replay/replay-codec';
import type { ReplayEvent, ReplayManifest } from '@axe/domain/replay/replay-event';

export const REPLAY_IMPORT_CHUNK_SIZE = 500;

@Injectable({ providedIn: 'root' })
export class ReplayLibraryService {
  private readonly store = inject(ReplayLogStore);
  private readonly saveDataService = inject(SaveDataService);
  private readonly fileArchiver = inject(FileArchiver);

  private readonly _isBusy = signal(false);
  readonly isBusy = this._isBusy.asReadonly();

  async load(id: number): Promise<{ manifest: ReplayManifest | null; events: ReplayEvent[] }> {
    const chunks = await this.store.listChunks(id);
    const events = chunks.flatMap((chunk) => decodeReplayEvents(chunk.bytes)).sort((a, b) => a.seq - b.seq);
    const manifestBytes = await this.store.getManifest(id);
    return { manifest: manifestBytes ? decodeReplayManifest(manifestBytes) : null, events };
  }

  async keyframeBefore(id: number, seq: number): Promise<Blob | null> {
    const keyframes = await this.store.listKeyframes(id);
    let best: Blob | null = null;
    for (const keyframe of keyframes) {
      if (keyframe.seq > seq) break;
      best = keyframe.blob;
    }
    return best ?? keyframes[0]?.blob ?? null;
  }

  async export(meta: ReplayRecordingMeta, withAssets: boolean): Promise<boolean> {
    if (this._isBusy()) return false;
    this._isBusy.set(true);
    try {
      const chunks = await this.store.listChunks(meta.id);
      const keyframes = await this.store.listKeyframes(meta.id);
      const manifestBytes = await this.store.getManifest(meta.id);
      const manifest = manifestBytes ? decodeReplayManifest(manifestBytes) : null;
      if (!manifest) {
        Logger.warn('[ReplayLibrary] 目録が無いため書き出せません', meta.id);
        return false;
      }

      const files = buildReplayArchiveFiles({
        manifest,
        chunks: chunks.map((chunk) => ({ index: chunk.index, events: decodeReplayEvents(chunk.bytes) })),
        keyframes: keyframes.map((keyframe) => ({ seq: keyframe.seq, blob: keyframe.blob })),
        assets: withAssets ? this.saveDataService.buildRoomAssetFiles() : [],
      });

      const blob = await this.fileArchiver.createZipBlobAsync(files);
      downloadBlob(blob, `${replayArchiveName(manifest)}.${REPLAY_ARCHIVE_EXTENSION}`);
      return true;
    } catch (reason) {
      Logger.warn('[ReplayLibrary] 書き出しに失敗しました', reason);
      return false;
    } finally {
      this._isBusy.set(false);
    }
  }

  async import(file: File): Promise<number | null> {
    if (this._isBusy()) return null;
    this._isBusy.set(true);
    try {
      const entries = await this.fileArchiver.readZipEntriesAsync(file);
      const content = await parseReplayArchive(entries);
      if (!content) {
        Logger.warn('[ReplayLibrary] リプレイとして読めませんでした', file.name);
        return null;
      }
      return await this.saveImported(content);
    } catch (reason) {
      Logger.warn('[ReplayLibrary] 読み込みに失敗しました', reason);
      return null;
    } finally {
      this._isBusy.set(false);
    }
  }

  private async saveImported(content: ReplayArchiveContent): Promise<number | null> {
    const id = await this.store.createRecording({
      roomName: content.manifest.roomName,
      startedAt: content.manifest.startedAt,
    });
    if (id == null) return null;

    let index = 0;
    for (let offset = 0; offset < content.events.length; offset += REPLAY_IMPORT_CHUNK_SIZE) {
      const events = content.events.slice(offset, offset + REPLAY_IMPORT_CHUNK_SIZE);
      const bytes = encodeReplayEvents(events);
      await this.store.appendChunk({
        recordingId: id,
        index: index++,
        seqStart: events[0].seq,
        seqEnd: events[events.length - 1].seq,
        eventCount: events.length,
        bytes,
      });
    }

    for (const keyframe of content.keyframes) {
      await this.store.putKeyframe({
        recordingId: id,
        seq: keyframe.seq,
        at: content.manifest.startedAt,
        blob: keyframe.blob,
      });
    }

    if (content.assets.length > 0) await this.fileArchiver.load(content.assets);

    await this.store.updateRecording(id, {
      endedAt: content.manifest.endedAt,
      manifest: encodeReplayManifest(content.manifest),
    });
    return id;
  }
}
