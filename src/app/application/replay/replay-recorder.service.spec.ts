import { TestBed } from '@angular/core/testing';
import { SaveDataService } from '@axe/application/file/save-data.service';
import {
  REPLAY_BASELINE_GRACE_MS,
  REPLAY_CHUNK_INTERVAL_MS,
  ReplayRecorderService,
} from '@axe/application/replay/replay-recorder.service';
import { localDispatch } from '@axe/core/network/network-messaging';
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
import type { ObjectContext } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { decodeReplayEvents, decodeReplayManifest } from '@axe/domain/replay/replay-codec';
import { ReplayDetailLevel, ReplayEventKind } from '@axe/domain/replay/replay-event';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

class FakeReplayLogStore extends ReplayLogStore {
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

  allEvents() {
    return this.chunks.flatMap((chunk) => decodeReplayEvents(chunk.bytes));
  }
}

function context(identifier: string, aliasName: string, syncData: Record<string, unknown>): ObjectContext {
  return { identifier, aliasName, majorVersion: 1, minorVersion: 0.5, syncData };
}

function sendUpdate(identifier: string, aliasName: string, syncData: Record<string, unknown>, sendFrom = 'peer-a') {
  localDispatch('UPDATE_GAME_OBJECT', context(identifier, aliasName, syncData), sendFrom);
}

describe('ReplayRecorderService', () => {
  let service: ReplayRecorderService;
  let store: FakeReplayLogStore;
  let objectStore: ObjectStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    store = new FakeReplayLogStore();
    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: ReplayLogStore, useValue: store },
        { provide: SaveDataService, useValue: { createRoomStateArchiveAsync: async () => new Blob(['<xml/>']) } },
      ],
    });
    objectStore = TestBed.inject(ObjectStore);
    service = TestBed.inject(ReplayRecorderService);

    const cursor = new PeerCursor('cursor-a');
    cursor.peerId = 'peer-a';
    cursor.userId = 'alice';
    cursor.name = 'アリス';
    cursor.role = PeerRole.Player;
    objectStore.add(cursor, false);
  });

  afterEach(async () => {
    if (service.isRecording()) await service.stop();
    vi.restoreAllMocks();
    for (const object of objectStore.getObjects()) objectStore.remove(object);
    vi.useRealTimers();
  });

  it('録画していないうちは何も記録しないこと', () => {
    sendUpdate('c1', 'character', { location: { name: 'table', x: 0, y: 0 }, posZ: 0 });
    expect(service.eventCount()).toBe(0);
    expect(service.recentEvents()).toHaveLength(0);
  });

  it('移動を誰が何をどうしたかとして記録すること', async () => {
    await service.start();
    sendUpdate('c1', 'character', { location: { name: 'table', x: 0, y: 0 }, posZ: 0 });
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    sendUpdate('c1', 'character', { location: { name: 'table', x: 100, y: 50 }, posZ: 0 });

    const [event] = service.recentEvents();
    expect(event.kind).toBe(ReplayEventKind.ObjectMove);
    expect(event.actorId).toBe('alice');
    expect(event.targetId).toBe('c1');
    expect(event.detail['to']).toEqual({ name: 'table', x: 100, y: 50, z: 0 });
  });

  it('録画開始時の盤面と同じ値の同期を記録しないこと', async () => {
    const character = { identifier: 'c1', aliasName: 'character', syncData: { posZ: 0 } };
    vi.spyOn(objectStore, 'getObjects').mockReturnValue([
      { identifier: 'c1', toContext: () => context('c1', 'character', { posZ: 0 }) },
    ] as never);

    await service.start();
    sendUpdate('c1', character.aliasName, { posZ: 0 });

    expect(service.recentEvents()).toHaveLength(0);
  });

  it('猶予のあいだに流れ込む初期同期を作成として記録しないこと', async () => {
    await service.start();
    sendUpdate('c9', 'character', { posZ: 0 });
    expect(service.recentEvents()).toHaveLength(0);

    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    sendUpdate('c8', 'character', { posZ: 0 });
    expect(service.recentEvents()).toHaveLength(1);
    expect(service.recentEvents()[0].kind).toBe(ReplayEventKind.ObjectCreate);
  });

  it('続けざまの移動を 1 件に畳むこと', async () => {
    await service.start();
    sendUpdate('c1', 'character', { location: { name: 'table', x: 0, y: 0 }, posZ: 0 });
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);

    for (let x = 10; x <= 50; x += 10) {
      sendUpdate('c1', 'character', { location: { name: 'table', x, y: 0 }, posZ: 0 });
      vi.advanceTimersByTime(50);
    }

    const events = service.recentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].merged).toBe(5);
    expect(events[0].detail['from']).toEqual({ name: 'table', x: 0, y: 0, z: 0 });
    expect(events[0].detail['to']).toEqual({ name: 'table', x: 50, y: 0, z: 0 });
  });

  it('雑音のイベントを記録しないこと', async () => {
    await service.start();
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    localDispatch('CURSOR_MOVE', [1, 2, 3], 'peer-a');
    localDispatch('HEART_BEAT', [1, 'a', null, 2], 'peer-a');
    expect(service.recentEvents()).toHaveLength(0);
  });

  it('ダイスやシャッフルの合図を記録すること', async () => {
    await service.start();
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    localDispatch('ROLL_DICE_SYMBOL', { identifier: 'd1' }, 'peer-a');
    localDispatch('SHUFFLE_CARD_STACK', { identifier: 's1' }, 'peer-a');

    expect(service.recentEvents().map((e) => e.kind)).toEqual([
      ReplayEventKind.ObjectDiceRoll,
      ReplayEventKind.ObjectShuffle,
    ]);
  });

  it('削除を記録すること', async () => {
    await service.start();
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    localDispatch('DELETE_GAME_OBJECT', { identifier: 'c1', aliasName: 'character' }, 'peer-a');

    expect(service.recentEvents()[0].kind).toBe(ReplayEventKind.ObjectRemove);
  });

  it('内緒話を宛先つきの秘匿として記録すること', async () => {
    await service.start();
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    sendUpdate('m1', 'chat', { value: 'ないしょ', from: 'alice', to: 'bob', tag: '', attributes: {} });

    expect(service.recentEvents()[0].visibility).toEqual({ kind: 'direct', to: ['bob'] });
  });

  it('チャットだけの詳細度では盤面の変化を記録しないこと', async () => {
    service.setDetailLevel(ReplayDetailLevel.ChatOnly);
    await service.start();
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    sendUpdate('c1', 'character', { location: { name: 'table', x: 10, y: 0 }, posZ: 0 });
    sendUpdate('m1', 'chat', { value: 'やあ', from: 'alice', attributes: {} });

    expect(service.recentEvents().map((e) => e.kind)).toEqual([ReplayEventKind.ChatMessage]);
  });

  it('一定時間ごとにチャンクを書き出すこと', async () => {
    await service.start();
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    sendUpdate('c1', 'character', { posZ: 10 });

    expect(store.chunks).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(REPLAY_CHUNK_INTERVAL_MS);
    expect(store.chunks).toHaveLength(1);
    expect(store.allEvents()).toHaveLength(1);
  });

  it('停止で残りを書き出し目録を残すこと', async () => {
    await service.start();
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    sendUpdate('c1', 'character', { posZ: 10 });
    await service.stop();

    expect(service.isRecording()).toBe(false);
    expect(store.allEvents()).toHaveLength(1);

    const manifest = decodeReplayManifest((await store.getManifest(1))!);
    expect(manifest?.roomName).toBeDefined();
    expect(manifest?.endedAt).not.toBeNull();
    expect(manifest?.actors.some((actor) => actor.userId === 'alice')).toBe(true);
    expect(manifest?.keyframes.length).toBeGreaterThan(0);
  });

  it('開始と停止で盤面を書き留めること', async () => {
    await service.start();
    expect(store.keyframes).toHaveLength(1);
    await service.stop();
    expect(store.keyframes).toHaveLength(2);
  });

  it('目印を打てること', async () => {
    await service.start();
    vi.advanceTimersByTime(REPLAY_BASELINE_GRACE_MS);
    await service.mark('第二幕');

    expect(service.recentEvents()[0].kind).toBe(ReplayEventKind.Marker);
    expect(service.recentEvents()[0].detail['label']).toBe('第二幕');
  });
});
