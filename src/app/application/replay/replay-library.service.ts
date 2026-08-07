import { inject, Injectable, signal } from '@angular/core';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { Logger } from '@axe/core/logging/logger';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ReplayLogStore, type ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { downloadBlob } from '@axe/core/util/download-blob';
import {
  buildReplayArchiveFiles,
  parseReplayArchive,
  REPLAY_ARCHIVE_EXTENSION,
  type ReplayArchiveContent,
  replayArchiveName,
} from '@axe/domain/replay/replay-archive';
import { collectReplayAssetIds } from '@axe/domain/replay/replay-assets';
import {
  decodeReplayEvents,
  decodeReplayManifest,
  encodeReplayEvents,
  encodeReplayManifest,
} from '@axe/domain/replay/replay-codec';
import type { ReplayEvent, ReplayManifest } from '@axe/domain/replay/replay-event';
import { decodeReplayKeyframe, type ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';
import { applyReplayEvents, indexOfSeq } from '@axe/domain/replay/replay-patch';

export const REPLAY_IMPORT_CHUNK_SIZE = 500;

@Injectable({ providedIn: 'root' })
export class ReplayLibraryService {
  private readonly store = inject(ReplayLogStore);
  private readonly saveDataService = inject(SaveDataService);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly imageStorage = inject(ImageStorage);
  private readonly audioStorage = inject(AudioStorage);

  private readonly _isBusy = signal(false);
  readonly isBusy = this._isBusy.asReadonly();

  async load(id: number): Promise<{ manifest: ReplayManifest | null; events: ReplayEvent[] }> {
    const chunks = await this.store.listChunks(id);
    const events = chunks.flatMap((chunk) => decodeReplayEvents(chunk.bytes)).sort((a, b) => a.seq - b.seq);
    const manifestBytes = await this.store.getManifest(id);
    return { manifest: manifestBytes ? decodeReplayManifest(manifestBytes) : null, events };
  }

  async keyframeBefore(id: number, seq: number): Promise<{ seq: number; blob: Blob } | null> {
    const keyframes = await this.store.listKeyframes(id);
    let best: { seq: number; blob: Blob } | null = null;
    for (const keyframe of keyframes) {
      if (keyframe.seq > seq) break;
      best = { seq: keyframe.seq, blob: keyframe.blob };
    }
    if (best) return best;
    const first = keyframes[0];
    return first ? { seq: first.seq, blob: first.blob } : null;
  }

  async boardBefore(id: number, seq: number, events: readonly ReplayEvent[]): Promise<ReplayObjectSnapshot[]> {
    const keyframe = await this.keyframeBefore(id, seq);
    const base = keyframe ? decodeReplayKeyframe(new Uint8Array(await keyframe.blob.arrayBuffer())) : [];
    const from = keyframe ? indexOfSeq(events, keyframe.seq) : -1;
    const upto = indexOfSeq(events, seq - 1);
    return applyReplayEvents(base, events.slice(from + 1, upto + 1));
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

      const chunked = chunks.map((chunk) => ({ index: chunk.index, events: decodeReplayEvents(chunk.bytes) }));
      const files = buildReplayArchiveFiles({
        manifest,
        chunks: chunked,
        keyframes: keyframes.map((keyframe) => ({ seq: keyframe.seq, blob: keyframe.blob })),
        assets: withAssets
          ? await this.assetFilesFor(
              keyframes,
              chunked.flatMap((chunk) => chunk.events)
            )
          : [],
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

  private async assetFilesFor(keyframes: readonly { blob: Blob }[], events: readonly ReplayEvent[]): Promise<File[]> {
    const snapshots: ReplayObjectSnapshot[] = [];
    for (const keyframe of keyframes) {
      try {
        snapshots.push(...decodeReplayKeyframe(new Uint8Array(await keyframe.blob.arrayBuffer())));
      } catch (reason) {
        Logger.warn('[ReplayLibrary] 読めない盤面は素材の数え上げから外します', reason);
      }
    }
    return this.saveDataService.buildAssetFiles(collectReplayAssetIds(snapshots, events));
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

  private async storeAsset(asset: File): Promise<void> {
    if (asset.type.startsWith('image/')) {
      await this.imageStorage.addAsync(asset);
      return;
    }
    if (asset.type.startsWith('audio/')) {
      await this.audioStorage.addAsync(asset);
      return;
    }
    Logger.warn('[ReplayLibrary] 画像でも音でもない添付は取り込みません', asset.name);
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

    for (const asset of content.assets) await this.storeAsset(asset);

    await this.store.updateRecording(id, {
      endedAt: content.manifest.endedAt,
      manifest: encodeReplayManifest(content.manifest),
    });
    return id;
  }
}
