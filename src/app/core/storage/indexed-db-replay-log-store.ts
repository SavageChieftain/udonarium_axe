import { Logger } from '@axe/core/logging/logger';
import {
  type ReplayChunkInput,
  type ReplayChunkRecord,
  type ReplayKeyframeInput,
  type ReplayKeyframeRecord,
  ReplayLogStore,
  type ReplayRecordingInput,
  type ReplayRecordingMeta,
  type ReplayRecordingUpdate,
  sortRecordingsByNewest,
} from '@axe/core/storage/replay-log-store';

const DB_NAME = 'axe-replay-logs';
const DB_VERSION = 1;
const RECORDING_STORE = 'recordings';
const CHUNK_STORE = 'chunks';
const KEYFRAME_STORE = 'keyframes';
const RECORDING_INDEX = 'recordingId';

interface RecordingRow extends ReplayRecordingMeta {
  manifest?: Uint8Array;
}

export class IndexedDbReplayLogStore extends ReplayLogStore {
  private static _instance: IndexedDbReplayLogStore;
  static get instance(): IndexedDbReplayLogStore {
    if (!IndexedDbReplayLogStore._instance) IndexedDbReplayLogStore._instance = new IndexedDbReplayLogStore();
    return IndexedDbReplayLogStore._instance;
  }

  private dbPromise: Promise<IDBDatabase | null> | null = null;

  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  }

  async createRecording(input: ReplayRecordingInput): Promise<number | null> {
    const row: Omit<RecordingRow, 'id'> = {
      roomName: input.roomName,
      startedAt: input.startedAt,
      endedAt: null,
      eventCount: 0,
      byteSize: 0,
    };
    const key = await this.run<IDBValidKey>([RECORDING_STORE], 'readwrite', (stores) =>
      stores[0].add(row as RecordingRow)
    );
    return typeof key === 'number' ? key : null;
  }

  async updateRecording(id: number, update: ReplayRecordingUpdate): Promise<void> {
    await this.mutateRecording(id, (row) => {
      if (update.roomName !== undefined) row.roomName = update.roomName;
      if (update.endedAt !== undefined) row.endedAt = update.endedAt;
      if (update.manifest !== undefined) row.manifest = update.manifest;
    });
  }

  async listRecordings(): Promise<ReplayRecordingMeta[]> {
    const rows = await this.run<RecordingRow[]>([RECORDING_STORE], 'readonly', (stores) => stores[0].getAll());
    if (!rows) return [];
    return sortRecordingsByNewest(rows.map(toMeta));
  }

  async getRecording(id: number): Promise<ReplayRecordingMeta | null> {
    const row = await this.run<RecordingRow | undefined>([RECORDING_STORE], 'readonly', (stores) => stores[0].get(id));
    return row ? toMeta(row) : null;
  }

  async getManifest(id: number): Promise<Uint8Array | null> {
    const row = await this.run<RecordingRow | undefined>([RECORDING_STORE], 'readonly', (stores) => stores[0].get(id));
    return row?.manifest ?? null;
  }

  async appendChunk(input: ReplayChunkInput): Promise<void> {
    await this.run<IDBValidKey>([CHUNK_STORE], 'readwrite', (stores) => stores[0].add(input));
    await this.mutateRecording(input.recordingId, (row) => {
      row.eventCount += input.eventCount;
      row.byteSize += input.bytes.byteLength;
    });
  }

  async listChunks(recordingId: number): Promise<ReplayChunkRecord[]> {
    const rows = await this.run<ReplayChunkRecord[]>([CHUNK_STORE], 'readonly', (stores) =>
      stores[0].index(RECORDING_INDEX).getAll(recordingId)
    );
    return (rows ?? []).sort((a, b) => a.index - b.index);
  }

  async putKeyframe(input: ReplayKeyframeInput): Promise<void> {
    const row = { ...input, byteSize: input.blob.size };
    await this.run<IDBValidKey>([KEYFRAME_STORE], 'readwrite', (stores) => stores[0].add(row));
    await this.mutateRecording(input.recordingId, (recording) => {
      recording.byteSize += row.byteSize;
    });
  }

  async listKeyframes(recordingId: number): Promise<ReplayKeyframeRecord[]> {
    const rows = await this.run<ReplayKeyframeRecord[]>([KEYFRAME_STORE], 'readonly', (stores) =>
      stores[0].index(RECORDING_INDEX).getAll(recordingId)
    );
    return (rows ?? []).sort((a, b) => a.seq - b.seq);
  }

  async removeRecording(id: number): Promise<void> {
    const chunks = await this.listChunks(id);
    const keyframes = await this.listKeyframes(id);
    await this.run<number>([CHUNK_STORE], 'readwrite', (stores) => {
      for (const chunk of chunks) stores[0].delete(chunk.id);
      return stores[0].count();
    });
    await this.run<number>([KEYFRAME_STORE], 'readwrite', (stores) => {
      for (const keyframe of keyframes) stores[0].delete(keyframe.id);
      return stores[0].count();
    });
    await this.run<undefined>([RECORDING_STORE], 'readwrite', (stores) => stores[0].delete(id));
  }

  async clear(): Promise<void> {
    for (const name of [CHUNK_STORE, KEYFRAME_STORE, RECORDING_STORE]) {
      await this.run<undefined>([name], 'readwrite', (stores) => stores[0].clear());
    }
  }

  private async mutateRecording(id: number, mutate: (row: RecordingRow) => void): Promise<void> {
    await this.run<IDBValidKey | undefined>([RECORDING_STORE], 'readwrite', (stores) => {
      const store = stores[0];
      const get = store.get(id);
      get.onsuccess = () => {
        const row = get.result as RecordingRow | undefined;
        if (!row) return;
        mutate(row);
        store.put(row);
      };
      return get as unknown as IDBRequest<IDBValidKey | undefined>;
    });
  }

  private open(): Promise<IDBDatabase | null> {
    if (!this.isAvailable()) return Promise.resolve(null);
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
        try {
          const request = indexedDB.open(DB_NAME, DB_VERSION);
          request.onupgradeneeded = () => upgrade(request.result);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => {
            Logger.warn('[ReplayLogStore] IndexedDB を開けませんでした', request.error);
            resolve(null);
          };
        } catch (reason) {
          Logger.warn('[ReplayLogStore] IndexedDB を開けませんでした', reason);
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  }

  private async run<T>(
    names: readonly string[],
    mode: IDBTransactionMode,
    action: (stores: IDBObjectStore[]) => IDBRequest<T>
  ): Promise<T | null> {
    const db = await this.open();
    if (!db) return null;

    return new Promise<T | null>((resolve) => {
      try {
        const transaction = db.transaction(names as string[], mode);
        const stores = names.map((name) => transaction.objectStore(name));
        const request = action(stores);
        const fail = () => {
          Logger.warn('[ReplayLogStore] 録画の読み書きに失敗しました', transaction.error);
          resolve(null);
        };
        transaction.oncomplete = () => {
          try {
            resolve(request.result ?? null);
          } catch {
            resolve(null);
          }
        };
        transaction.onerror = fail;
        transaction.onabort = fail;
      } catch (reason) {
        Logger.warn('[ReplayLogStore] 録画の読み書きに失敗しました', reason);
        resolve(null);
      }
    });
  }
}

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(RECORDING_STORE)) {
    db.createObjectStore(RECORDING_STORE, { keyPath: 'id', autoIncrement: true });
  }
  if (!db.objectStoreNames.contains(CHUNK_STORE)) {
    const chunks = db.createObjectStore(CHUNK_STORE, { keyPath: 'id', autoIncrement: true });
    chunks.createIndex(RECORDING_INDEX, RECORDING_INDEX, { unique: false });
  }
  if (!db.objectStoreNames.contains(KEYFRAME_STORE)) {
    const keyframes = db.createObjectStore(KEYFRAME_STORE, { keyPath: 'id', autoIncrement: true });
    keyframes.createIndex(RECORDING_INDEX, RECORDING_INDEX, { unique: false });
  }
}

function toMeta(row: RecordingRow): ReplayRecordingMeta {
  return {
    id: row.id,
    roomName: row.roomName,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    eventCount: row.eventCount,
    byteSize: row.byteSize,
  };
}
