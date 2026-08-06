import { TestBed } from '@angular/core/testing';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { ReplayLibraryService } from '@axe/application/replay/replay-library.service';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import {
  type ReplayChunkInput,
  type ReplayChunkRecord,
  type ReplayKeyframeInput,
  type ReplayKeyframeRecord,
  ReplayLogStore,
  type ReplayRecordingInput,
  type ReplayRecordingMeta,
  type ReplayRecordingUpdate,
} from '@axe/core/storage/replay-log-store';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { encodeReplayEvents, encodeReplayManifest } from '@axe/domain/replay/replay-codec';
import {
  PUBLIC_VISIBILITY,
  REPLAY_FORMAT_VERSION,
  ReplayDetailLevel,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayManifest,
} from '@axe/domain/replay/replay-event';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

const manifest: ReplayManifest = {
  formatVersion: REPLAY_FORMAT_VERSION,
  roomName: '第一夜',
  startedAt: new Date(2026, 0, 2, 20, 5).getTime(),
  endedAt: new Date(2026, 0, 2, 23, 40).getTime(),
  recordedBy: {
    userId: 'gm',
    peerId: 'p1',
    name: 'GM',
    role: PeerRole.GameMaster,
    imageIdentifier: '',
    sinceSeq: 0,
  },
  detailLevel: ReplayDetailLevel.Notable,
  actors: [],
  targets: [],
  keyframes: [],
  chunks: [],
};

function event(seq: number): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind: ReplayEventKind.ChatMessage,
    actorId: 'gm',
    detail: { text: `発言 ${seq}` },
    visibility: PUBLIC_VISIBILITY,
  };
}

class FakeStore extends ReplayLogStore {
  private nextId = 1;
  readonly recordings = new Map<number, ReplayRecordingMeta & { manifest?: Uint8Array }>();
  readonly chunks: ReplayChunkInput[] = [];
  readonly keyframes: ReplayKeyframeInput[] = [];

  isAvailable(): boolean {
    return true;
  }
  async createRecording(input: ReplayRecordingInput): Promise<number | null> {
    const id = this.nextId++;
    this.recordings.set(id, { id, ...input, endedAt: null, eventCount: 0, byteSize: 0 });
    return id;
  }
  async updateRecording(id: number, update: ReplayRecordingUpdate): Promise<void> {
    const row = this.recordings.get(id);
    if (row) Object.assign(row, update);
  }
  async listRecordings(): Promise<ReplayRecordingMeta[]> {
    return [...this.recordings.values()];
  }
  async getRecording(id: number): Promise<ReplayRecordingMeta | null> {
    return this.recordings.get(id) ?? null;
  }
  async getManifest(id: number): Promise<Uint8Array | null> {
    return this.recordings.get(id)?.manifest ?? null;
  }
  async appendChunk(input: ReplayChunkInput): Promise<void> {
    this.chunks.push(input);
  }
  async listChunks(recordingId: number): Promise<ReplayChunkRecord[]> {
    return this.chunks.filter((c) => c.recordingId === recordingId).map((c, index) => ({ ...c, id: index + 1 }));
  }
  async putKeyframe(input: ReplayKeyframeInput): Promise<void> {
    this.keyframes.push(input);
  }
  async listKeyframes(recordingId: number): Promise<ReplayKeyframeRecord[]> {
    return this.keyframes
      .filter((k) => k.recordingId === recordingId)
      .map((k, index) => ({ ...k, id: index + 1, byteSize: k.blob.size }));
  }
  async removeRecording(id: number): Promise<void> {
    this.recordings.delete(id);
  }
  async clear(): Promise<void> {
    this.recordings.clear();
  }
}

describe('ReplayLibraryService', () => {
  let service: ReplayLibraryService;
  let store: FakeStore;
  let archiver: FileArchiver;

  async function seedRecording(): Promise<ReplayRecordingMeta> {
    const id = (await store.createRecording({ roomName: manifest.roomName, startedAt: manifest.startedAt }))!;
    await store.appendChunk({
      recordingId: id,
      index: 0,
      seqStart: 1,
      seqEnd: 2,
      eventCount: 2,
      bytes: encodeReplayEvents([event(1), event(2)]),
    });
    await store.appendChunk({
      recordingId: id,
      index: 1,
      seqStart: 3,
      seqEnd: 3,
      eventCount: 1,
      bytes: encodeReplayEvents([event(3)]),
    });
    await store.putKeyframe({ recordingId: id, seq: 0, at: manifest.startedAt, blob: new Blob(['<a/>']) });
    await store.putKeyframe({ recordingId: id, seq: 2, at: manifest.startedAt, blob: new Blob(['<b/>']) });
    await store.updateRecording(id, { manifest: encodeReplayManifest(manifest) });
    return (await store.getRecording(id))!;
  }

  beforeEach(() => {
    store = new FakeStore();
    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: ReplayLogStore, useValue: store },
        { provide: SaveDataService, useValue: { buildRoomAssetFiles: () => [new File(['png'], 'image-1.png')] } },
      ],
    });
    archiver = TestBed.inject(FileArchiver);
    service = TestBed.inject(ReplayLibraryService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('記録をつなげて seq 順に読み出すこと', async () => {
    const meta = await seedRecording();
    const loaded = await service.load(meta.id);
    expect(loaded.events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(loaded.manifest?.roomName).toBe('第一夜');
  });

  it('指定より手前で一番近いキーフレームを返すこと', async () => {
    const meta = await seedRecording();
    expect(await (await service.keyframeBefore(meta.id, 1))?.blob.text()).toBe('<a/>');
    expect((await service.keyframeBefore(meta.id, 1))?.seq).toBe(0);
    expect(await (await service.keyframeBefore(meta.id, 5))?.blob.text()).toBe('<b/>');
    expect((await service.keyframeBefore(meta.id, 5))?.seq).toBe(2);
  });

  it('先頭より手前を求めても最初のキーフレームを返すこと', async () => {
    const meta = await seedRecording();
    expect(await (await service.keyframeBefore(meta.id, -1))?.blob.text()).toBe('<a/>');
  });

  it('書き出した束を読み戻して同じ記録になること', async () => {
    const meta = await seedRecording();
    const zipSpy = vi.spyOn(archiver, 'createZipBlobAsync').mockResolvedValue(new Blob(['zip']));
    vi.spyOn(archiver, 'load').mockResolvedValue(undefined);

    expect(await service.export(meta, false)).toBe(true);
    const files = zipSpy.mock.calls[0][0] as File[];
    const entries = files.map((file) => ({ name: file.name, type: file.type, blob: file as Blob }));
    vi.spyOn(archiver, 'readZipEntriesAsync').mockResolvedValue(entries);

    const importedId = await service.import(new File(['zip'], 'replay.zip'));
    expect(importedId).not.toBeNull();

    const loaded = await service.load(importedId!);
    expect(loaded.events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(loaded.manifest?.roomName).toBe('第一夜');
    expect((await store.listKeyframes(importedId!)).map((k) => k.seq)).toEqual([0, 2]);
  });

  it('素材を含めるとイメージも束ねること', async () => {
    const meta = await seedRecording();
    const zipSpy = vi.spyOn(archiver, 'createZipBlobAsync').mockResolvedValue(new Blob(['zip']));

    await service.export(meta, true);
    const files = zipSpy.mock.calls[0][0] as File[];
    expect(files.some((file) => file.name === 'assets/image-1.png')).toBe(true);
  });

  it('目録の無い記録は書き出さないこと', async () => {
    const id = (await store.createRecording({ roomName: '', startedAt: 0 }))!;
    const meta = (await store.getRecording(id))!;
    expect(await service.export(meta, false)).toBe(false);
  });

  it('リプレイでない zip を読み込まないこと', async () => {
    vi.spyOn(archiver, 'readZipEntriesAsync').mockResolvedValue([
      { name: 'data.xml', type: 'text/plain', blob: new Blob(['<room/>']) },
    ]);
    expect(await service.import(new File(['zip'], 'room.zip'))).toBeNull();
  });
});
