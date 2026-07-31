export interface RoomSnapshotMeta {
  id: number;
  roomName: string;
  savedAt: number;
  byteSize: number;
}

export interface RoomSnapshotRecord extends RoomSnapshotMeta {
  blob: Blob;
}

export interface RoomSnapshotInput {
  roomName: string;
  savedAt: number;
  blob: Blob;
}

export interface RoomSnapshotRetention {
  maxCount: number;
  maxTotalBytes: number;
}

const MEGA_BYTE = 1024 * 1024;

export const DEFAULT_ROOM_SNAPSHOT_RETENTION: RoomSnapshotRetention = {
  maxCount: 5,
  maxTotalBytes: 256 * MEGA_BYTE,
};

export abstract class RoomSnapshotStore {
  abstract isAvailable(): boolean;
  abstract put(input: RoomSnapshotInput): Promise<number | null>;
  abstract list(): Promise<RoomSnapshotMeta[]>;
  abstract get(id: number): Promise<RoomSnapshotRecord | null>;
  abstract remove(id: number): Promise<void>;
  abstract clear(): Promise<void>;
}

export function sortSnapshotsByNewest(metas: readonly RoomSnapshotMeta[]): RoomSnapshotMeta[] {
  return [...metas].sort((a, b) => b.savedAt - a.savedAt || b.id - a.id);
}

export function selectExpiredSnapshots(
  metas: readonly RoomSnapshotMeta[],
  retention: RoomSnapshotRetention = DEFAULT_ROOM_SNAPSHOT_RETENTION
): number[] {
  const sorted = sortSnapshotsByNewest(metas);
  const expired: number[] = [];
  let keptBytes = 0;
  let isFull = false;

  sorted.forEach((meta, index) => {
    if (index === 0) {
      keptBytes = meta.byteSize;
      return;
    }
    if (isFull || index >= retention.maxCount || keptBytes + meta.byteSize > retention.maxTotalBytes) {
      isFull = true;
      expired.push(meta.id);
      return;
    }
    keptBytes += meta.byteSize;
  });

  return expired;
}
