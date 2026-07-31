import { IndexedDbRoomSnapshotStore } from '@axe/core/storage/indexed-db-room-snapshot-store';
import { RoomSnapshotMeta, selectExpiredSnapshots, sortSnapshotsByNewest } from '@axe/core/storage/room-snapshot-store';

function meta(id: number, savedAt: number, byteSize: number): RoomSnapshotMeta {
  return { id, savedAt, byteSize, roomName: 'room' };
}

describe('sortSnapshotsByNewest', () => {
  it('savedAt の新しい順に並べる', () => {
    const sorted = sortSnapshotsByNewest([meta(1, 100, 1), meta(2, 300, 1), meta(3, 200, 1)]);
    expect(sorted.map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it('savedAt が同値なら id の大きい方を新しいとみなす', () => {
    const sorted = sortSnapshotsByNewest([meta(1, 100, 1), meta(3, 100, 1), meta(2, 100, 1)]);
    expect(sorted.map((m) => m.id)).toEqual([3, 2, 1]);
  });

  it('入力を破壊しない', () => {
    const input = [meta(1, 100, 1), meta(2, 300, 1)];
    sortSnapshotsByNewest(input);
    expect(input.map((m) => m.id)).toEqual([1, 2]);
  });
});

describe('selectExpiredSnapshots', () => {
  const retention = { maxCount: 3, maxTotalBytes: 100 };

  it('上限内なら何も期限切れにしない', () => {
    const expired = selectExpiredSnapshots([meta(1, 100, 10), meta(2, 200, 10)], retention);
    expect(expired).toEqual([]);
  });

  it('世代数の上限を超えた分を古い順に期限切れにする', () => {
    const metas = [meta(1, 100, 10), meta(2, 200, 10), meta(3, 300, 10), meta(4, 400, 10), meta(5, 500, 10)];
    expect(selectExpiredSnapshots(metas, retention).sort()).toEqual([1, 2]);
  });

  it('合計サイズの上限を超えた時点より古い世代を期限切れにする', () => {
    const metas = [meta(1, 100, 60), meta(2, 200, 60), meta(3, 300, 60)];
    expect(selectExpiredSnapshots(metas, retention).sort()).toEqual([1, 2]);
  });

  it('最新 1 件は単体で容量上限を超えていても残す', () => {
    const metas = [meta(1, 100, 10), meta(2, 200, 999)];
    expect(selectExpiredSnapshots(metas, retention)).toEqual([1]);
  });

  it('一度上限に達したらそれより古い小さな世代も残さない', () => {
    const metas = [meta(1, 100, 1), meta(2, 200, 90), meta(3, 300, 20)];
    expect(selectExpiredSnapshots(metas, retention).sort()).toEqual([1, 2]);
  });

  it('空の一覧を渡しても落ちない', () => {
    expect(selectExpiredSnapshots([], retention)).toEqual([]);
  });
});

describe('IndexedDbRoomSnapshotStore', () => {
  it('シングルトンインスタンスを返す', () => {
    expect(IndexedDbRoomSnapshotStore.instance).toBe(IndexedDbRoomSnapshotStore.instance);
  });

  it('IndexedDB が無い環境では利用不可を返す', () => {
    expect(IndexedDbRoomSnapshotStore.instance.isAvailable()).toBe(typeof indexedDB !== 'undefined');
  });

  it('利用不可の環境では一覧が空になる', async () => {
    const store = IndexedDbRoomSnapshotStore.instance;
    vi.spyOn(store, 'isAvailable').mockReturnValue(false);
    await expect(store.list()).resolves.toEqual([]);
    await expect(store.get(1)).resolves.toBeNull();
    vi.restoreAllMocks();
  });
});
