import { IndexedDbRoomSnapshotStore } from '@axe/core/storage/indexed-db-room-snapshot-store';
import { RoomSnapshotMeta, selectExpiredSnapshots, sortSnapshotsByNewest } from '@axe/core/storage/room-snapshot-store';

function meta(id: number, savedAt: number, byteSize: number): RoomSnapshotMeta {
  return { id, savedAt, byteSize, roomName: 'room' };
}

describe('sortSnapshotsByNewest', () => {
  it('orders them by when they were saved, newest first', () => {
    const sorted = sortSnapshotsByNewest([meta(1, 100, 1), meta(2, 300, 1), meta(3, 200, 1)]);
    expect(sorted.map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it('counts the higher id as newer on a tie', () => {
    const sorted = sortSnapshotsByNewest([meta(1, 100, 1), meta(3, 100, 1), meta(2, 100, 1)]);
    expect(sorted.map((m) => m.id)).toEqual([3, 2, 1]);
  });

  it('leaves the input alone', () => {
    const input = [meta(1, 100, 1), meta(2, 300, 1)];
    sortSnapshotsByNewest(input);
    expect(input.map((m) => m.id)).toEqual([1, 2]);
  });
});

describe('selectExpiredSnapshots', () => {
  const retention = { maxCount: 3, maxTotalBytes: 100 };

  it('expires nothing within the limits', () => {
    const expired = selectExpiredSnapshots([meta(1, 100, 10), meta(2, 200, 10)], retention);
    expect(expired).toEqual([]);
  });

  it('expires the oldest past a limit on the count', () => {
    const metas = [meta(1, 100, 10), meta(2, 200, 10), meta(3, 300, 10), meta(4, 400, 10), meta(5, 500, 10)];
    expect(selectExpiredSnapshots(metas, retention).sort()).toEqual([1, 2]);
  });

  it('expires everything older than where the total size crosses the limit', () => {
    const metas = [meta(1, 100, 60), meta(2, 200, 60), meta(3, 300, 60)];
    expect(selectExpiredSnapshots(metas, retention).sort()).toEqual([1, 2]);
  });

  it('keeps the newest even when it alone exceeds the size', () => {
    const metas = [meta(1, 100, 10), meta(2, 200, 999)];
    expect(selectExpiredSnapshots(metas, retention)).toEqual([1]);
  });

  it('keeps nothing older once the limit is crossed, small though it may be', () => {
    const metas = [meta(1, 100, 1), meta(2, 200, 90), meta(3, 300, 20)];
    expect(selectExpiredSnapshots(metas, retention).sort()).toEqual([1, 2]);
  });

  it('survives an empty list', () => {
    expect(selectExpiredSnapshots([], retention)).toEqual([]);
  });
});

describe('IndexedDbRoomSnapshotStore', () => {
  it('returns the one instance', () => {
    expect(IndexedDbRoomSnapshotStore.instance).toBe(IndexedDbRoomSnapshotStore.instance);
  });

  it('reports itself unavailable without a database', () => {
    expect(IndexedDbRoomSnapshotStore.instance.isAvailable()).toBe(typeof indexedDB !== 'undefined');
  });

  it('lists nothing where it is unavailable', async () => {
    const store = IndexedDbRoomSnapshotStore.instance;
    vi.spyOn(store, 'isAvailable').mockReturnValue(false);
    await expect(store.list()).resolves.toEqual([]);
    await expect(store.get(1)).resolves.toBeNull();
    vi.restoreAllMocks();
  });
});
