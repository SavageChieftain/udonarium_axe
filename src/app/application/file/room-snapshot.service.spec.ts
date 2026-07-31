import { TestBed } from '@angular/core/testing';
import { RoomSnapshotService } from '@axe/application/file/room-snapshot.service';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import {
  RoomSnapshotInput,
  RoomSnapshotMeta,
  RoomSnapshotRecord,
  RoomSnapshotStore,
  sortSnapshotsByNewest,
} from '@axe/core/storage/room-snapshot-store';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

class FakeRoomSnapshotStore extends RoomSnapshotStore {
  available = true;
  records: RoomSnapshotRecord[] = [];
  private nextId = 1;

  isAvailable(): boolean {
    return this.available;
  }

  async put(input: RoomSnapshotInput): Promise<number> {
    const id = this.nextId++;
    this.records.push({
      id,
      roomName: input.roomName,
      savedAt: input.savedAt,
      byteSize: input.blob.size,
      blob: input.blob,
    });
    return id;
  }

  async list(): Promise<RoomSnapshotMeta[]> {
    return sortSnapshotsByNewest(
      this.records.map((record) => ({
        id: record.id,
        roomName: record.roomName,
        savedAt: record.savedAt,
        byteSize: record.byteSize,
      }))
    );
  }

  async get(id: number): Promise<RoomSnapshotRecord | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async remove(id: number): Promise<void> {
    this.records = this.records.filter((record) => record.id !== id);
  }

  async clear(): Promise<void> {
    this.records = [];
  }
}

describe('RoomSnapshotService', () => {
  let store: FakeRoomSnapshotStore;
  let load: ReturnType<typeof vi.fn>;
  let service: RoomSnapshotService;

  beforeEach(() => {
    store = new FakeRoomSnapshotStore();
    load = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: RoomSnapshotStore, useValue: store },
        { provide: SaveDataService, useValue: { createRoomArchiveAsync: () => Promise.resolve(new Blob(['abc'])) } },
        { provide: FileArchiver, useValue: { load } },
        RoomSnapshotService,
      ],
    });
    service = TestBed.inject(RoomSnapshotService);
  });

  it('保存したスナップショットが一覧に反映される', async () => {
    const meta = await service.capture();

    expect(meta).not.toBeNull();
    expect(service.snapshots()).toHaveLength(1);
    expect(service.latest?.byteSize).toBe(3);
  });

  it('世代上限を超えた古いスナップショットを削除する', async () => {
    for (let i = 0; i < 7; i++) {
      await service.capture();
    }

    expect(service.snapshots()).toHaveLength(5);
    expect(store.records).toHaveLength(5);
  });

  it('復元は保存済み zip を FileArchiver に流す', async () => {
    const meta = await service.capture();

    await expect(service.restore(meta!.id)).resolves.toBe(true);
    expect(load).toHaveBeenCalledOnce();
    const files = load.mock.calls[0][0] as File[];
    expect(files[0].name).toBe('room-snapshot.zip');
  });

  it('存在しない id の復元は false を返す', async () => {
    await expect(service.restore(999)).resolves.toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it('削除と全消去が一覧に反映される', async () => {
    const first = await service.capture();
    await service.capture();

    await service.remove(first!.id);
    expect(service.snapshots()).toHaveLength(1);

    await service.clear();
    expect(service.snapshots()).toHaveLength(0);
  });

  it('ストレージが使えない環境では保存も復元も行わない', async () => {
    store.available = false;

    await expect(service.capture()).resolves.toBeNull();
    await expect(service.restore(1)).resolves.toBe(false);
    expect(store.records).toHaveLength(0);
  });
});
