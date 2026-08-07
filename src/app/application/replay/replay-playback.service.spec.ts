import { TestBed } from '@angular/core/testing';
import { ReplayLibraryService } from '@axe/application/replay/replay-library.service';
import {
  REPLAY_SLIDE_MAX_MS,
  REPLAY_TRAIL_LINGER_MS,
  ReplayPlaybackService,
} from '@axe/application/replay/replay-playback.service';
import { isNetworkIsolated, setNetworkIsolated } from '@axe/core/network/network-isolation';
import { networkMessage$ } from '@axe/core/network/network-messaging';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ObjectSynchronizer } from '@axe/core/sync/object-synchronizer';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { createReplayEntry } from '@axe/domain/replay/replay-edit';
import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import { encodeReplayKeyframe, type ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function moveEvent(seq: number, x: number, previousX: number): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind: ReplayEventKind.ObjectMove,
    actorId: 'alice',
    targetId: 'c1',
    detail: { from: { name: 'table', x: previousX, y: 0, z: 0 }, to: { name: 'table', x, y: 0, z: 0 } },
    patch: {
      identifier: 'c1',
      aliasName: 'character',
      before: { 'attributes.location': { name: 'table', x: previousX, y: 0 } },
      after: { 'attributes.location': { name: 'table', x, y: 0 } },
    },
    visibility: PUBLIC_VISIBILITY,
  };
}

describe('ReplayPlaybackService', () => {
  const keyframeObjects: ReplayObjectSnapshot[] = [
    {
      identifier: 'c1',
      aliasName: 'character',
      syncData: { value: '', attributes: { location: { name: 'table', x: 0, y: 0 }, posZ: 0 } },
    },
  ];
  const soundEvent: ReplayEvent = {
    seq: 2,
    at: 2000,
    t: 2000,
    kind: ReplayEventKind.MediaSoundEffect,
    actorId: 'alice',
    detail: { identifier: 'se-dice' },
    signal: { name: 'SOUND_EFFECT', data: 'se-dice' },
    visibility: PUBLIC_VISIBILITY,
  };
  const events = [moveEvent(1, 10, 0), soundEvent, moveEvent(3, 30, 20)];

  let service: ReplayPlaybackService;
  let objectStore: ObjectStore;
  let library: {
    load: ReturnType<typeof vi.fn>;
    keyframeBefore: ReturnType<typeof vi.fn>;
  };
  let heard: string[];
  let offHeard: () => void;

  function soundsHeard(): string[] {
    return heard;
  }

  function characterX(): number | undefined {
    const character = objectStore.get<GameCharacter>('c1');
    return character?.location.x;
  }

  beforeEach(() => {
    heard = [];
    offHeard = networkMessage$.subscribe((message) => {
      if (message.eventName === 'SOUND_EFFECT') heard.push(String(message.data));
    });
    library = {
      load: vi.fn().mockResolvedValue({ manifest: null, events }),
      keyframeBefore: vi
        .fn()
        .mockResolvedValue({ seq: 0, blob: new Blob([encodeReplayKeyframe(keyframeObjects) as BlobPart]) }),
    };

    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, { provide: ReplayLibraryService, useValue: library }],
    });
    objectStore = TestBed.inject(ObjectStore);
    vi.spyOn(TestBed.inject(ObjectSynchronizer), 'requestFullSync').mockReturnValue(0);
    service = TestBed.inject(ReplayPlaybackService);
  });

  afterEach(async () => {
    offHeard();
    await service.close();
    setNetworkIsolated(false);
    for (const object of objectStore.getObjects()) objectStore.remove(object);
    objectStore.clearDeleteHistory();
    vi.restoreAllMocks();
  });

  it('記録を開いて先頭に立つこと', async () => {
    expect(await service.open(1)).toBe(true);
    expect(service.isOpen()).toBe(true);
    expect(service.cursor()).toBe(0);
    expect(service.currentEvent()?.seq).toBe(1);
  });

  it('空の記録は開かないこと', async () => {
    library.load.mockResolvedValue({ manifest: null, events: [] });
    expect(await service.open(1)).toBe(false);
    expect(service.isOpen()).toBe(false);
  });

  it('前後に送れること', async () => {
    await service.open(1);
    await service.next();
    expect(service.cursor()).toBe(1);
    await service.previous();
    expect(service.cursor()).toBe(0);
  });

  it('端から先には進まないこと', async () => {
    await service.open(1);
    await service.previous();
    expect(service.cursor()).toBe(0);
    await service.toEnd();
    await service.next();
    expect(service.cursor()).toBe(events.length - 1);
    expect(service.isAtEnd()).toBe(true);
  });

  it('盤面再生に入ると同卓者から隔離すること', async () => {
    await service.open(1);
    expect(isNetworkIsolated()).toBe(false);

    await service.enterBoardMode();
    expect(isNetworkIsolated()).toBe(true);

    await service.exitBoardMode();
    expect(isNetworkIsolated()).toBe(false);
  });

  it('キーフレームから積み上げて盤面を作ること', async () => {
    await service.open(1);
    await service.enterBoardMode();
    expect(characterX()).toBe(10);

    await service.toEnd();
    expect(characterX()).toBe(30);
  });

  it('巻き戻してもキーフレームから作り直すこと', async () => {
    await service.open(1);
    await service.enterBoardMode();
    await service.toEnd();
    expect(characterX()).toBe(30);

    await service.toStart();
    expect(characterX()).toBe(10);
    expect(soundsHeard()).toEqual([]);
  });

  it('1 つ送るときに効果音を鳴らし直すこと', async () => {
    await service.open(1);
    await service.enterBoardMode();
    expect(soundsHeard()).toEqual([]);

    await service.next();
    expect(soundsHeard()).toEqual(['se-dice']);
  });

  it('飛ばしたときは効果音を鳴らさないこと', async () => {
    await service.open(1);
    await service.enterBoardMode();
    await service.toEnd();
    expect(soundsHeard()).toEqual([]);
  });

  it('読み物として送るだけなら効果音を鳴らさないこと', async () => {
    await service.open(1);
    await service.next();
    expect(soundsHeard()).toEqual([]);
  });

  it('1 つ送るときは盤面を積み増しで進めること', async () => {
    vi.useFakeTimers();
    try {
      await service.open(1);
      await service.enterBoardMode();
      expect(characterX()).toBe(10);

      await service.next();
      await vi.advanceTimersByTimeAsync(REPLAY_SLIDE_MAX_MS);
      await service.next();
      await vi.advanceTimersByTimeAsync(REPLAY_SLIDE_MAX_MS);

      expect(characterX()).toBe(30);
    } finally {
      vi.useRealTimers();
    }
  });

  it('1 つ送るときはコマを経路に沿って滑らせること', async () => {
    vi.useFakeTimers();
    try {
      await service.open(1);
      await service.enterBoardMode();
      await service.next();
      await service.next();

      expect(service.routeTrail()?.identifier).toBe('c1');
      expect(characterX()).toBeLessThan(30);

      await vi.advanceTimersByTimeAsync(REPLAY_SLIDE_MAX_MS);
      expect(characterX()).toBe(30);
    } finally {
      vi.useRealTimers();
    }
  });

  it('滑り終わったら経路の表示を消すこと', async () => {
    vi.useFakeTimers();
    try {
      await service.open(1);
      await service.enterBoardMode();
      await service.next();
      await service.next();

      await vi.advanceTimersByTimeAsync(REPLAY_SLIDE_MAX_MS + REPLAY_TRAIL_LINGER_MS);
      expect(service.routeTrail()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('飛ばしたときは滑らせず経路も出さないこと', async () => {
    await service.open(1);
    await service.enterBoardMode();
    await service.toEnd();

    expect(service.routeTrail()).toBeNull();
    expect(characterX()).toBe(30);
  });

  it('盤面再生を抜けたら元の卓に戻すこと', async () => {
    const character = new GameCharacter('live-1');
    character.location.x = 555;
    objectStore.add(character, false);

    await service.open(1);
    await service.enterBoardMode();
    expect(objectStore.get('live-1')).toBeNull();

    await service.exitBoardMode();
    expect(objectStore.get<GameCharacter>('live-1')?.location.x).toBe(555);
    expect(objectStore.get('c1')).toBeNull();
  });

  it('盤面再生を抜けたら同卓者へ再同期を求めること', async () => {
    const requestFullSync = vi.spyOn(TestBed.inject(ObjectSynchronizer), 'requestFullSync').mockReturnValue(0);
    await service.open(1);
    await service.enterBoardMode();
    await service.exitBoardMode();
    expect(requestFullSync).toHaveBeenCalledTimes(1);
  });

  it('閉じるときに盤面再生も畳むこと', async () => {
    await service.open(1);
    await service.enterBoardMode();
    await service.close();

    expect(service.isBoardMode()).toBe(false);
    expect(isNetworkIsolated()).toBe(false);
    expect(service.isOpen()).toBe(false);
  });

  it('差し込んだ発言を卓のチャットにも出すこと', async () => {
    const entry = createReplayEntry(
      {
        kind: ReplayEventKind.ChatMessage,
        actorId: 'alice',
        speaker: '盗賊',
        text: '差し込んだ台詞',
        tabIdentifier: '',
      },
      2,
      2000
    );
    library.load.mockResolvedValue({ manifest: null, events: [events[0], entry] });

    await service.open(1);
    await service.enterBoardMode();
    await service.next();

    const message = objectStore.get<ChatMessage>(entry.targetId!);
    expect(message).not.toBeNull();
    expect(message?.text).toBe('差し込んだ台詞');
    expect(message?.name).toBe('盗賊');
    expect(message?.from).toBe('alice');
  });

  it('読み物として送るだけなら盤面に触れないこと', async () => {
    const character = new GameCharacter('live-1');
    character.location.x = 555;
    objectStore.add(character, false);

    await service.open(1);
    await service.next();
    await service.toEnd();

    expect(objectStore.get<GameCharacter>('live-1')?.location.x).toBe(555);
    expect(isNetworkIsolated()).toBe(false);
  });
});
