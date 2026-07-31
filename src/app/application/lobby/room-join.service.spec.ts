import { TestBed } from '@angular/core/testing';
import { RoomJoinService } from '@axe/application/lobby/room-join.service';
import { type NetworkPeerEvent, ObjectChangeService } from '@axe/application/sync/object-change.service';
import { EventChannel } from '@axe/core/event/event-channel';
import { Network } from '@axe/core/index';
import { IPeerContext, PeerContext } from '@axe/core/network/peer-context';
import { IRoomInfo, RoomInfo } from '@axe/core/network/room-info';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

class StubObjectChangeService {
  readonly networkOpen$ = new EventChannel<NetworkPeerEvent>();
  readonly peerConnect$ = new EventChannel<NetworkPeerEvent>();
  readonly peerDisconnect$ = new EventChannel<NetworkPeerEvent>();
}

function peerContext(peerId: string, roomId: string, roomName: string): IPeerContext {
  const context = PeerContext.parse(peerId);
  context.roomId = roomId;
  context.roomName = roomName;
  return context;
}

describe('RoomJoinService', () => {
  let service: RoomJoinService;
  let stubChange: StubObjectChangeService;
  let connectedPeers: IPeerContext[];
  let originalMyCursor: PeerCursor;

  beforeEach(() => {
    stubChange = new StubObjectChangeService();
    connectedPeers = [];
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, { provide: ObjectChangeService, useValue: stubChange }],
    });
    service = TestBed.inject(RoomJoinService);

    originalMyCursor = PeerCursor.myCursor;
    PeerCursor.myCursor = { peerId: '' } as PeerCursor;
    vi.spyOn(Network, 'open').mockImplementation(() => {});
    vi.spyOn(Network, 'openStandby').mockImplementation(() => {});
    vi.spyOn(Network, 'connect').mockResolvedValue(true);
    vi.spyOn(Network, 'peerId', 'get').mockReturnValue('my-peer');
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'user' } as PeerContext);
    vi.spyOn(Network, 'peerContexts', 'get').mockImplementation(() => connectedPeers as PeerContext[]);
  });

  afterEach(() => {
    PeerCursor.myCursor = originalMyCursor;
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('findRoom', () => {
    it('部屋 ID が一致する部屋を返す', async () => {
      const rooms: IRoomInfo[] = [new RoomInfo('abc', 'first'), new RoomInfo('xyz', 'second')];
      vi.spyOn(Network, 'listAllRooms').mockResolvedValue(rooms);

      await expect(service.findRoom('xyz')).resolves.toBe(rooms[1]);
    });

    it('一致する部屋が無ければ null を返す', async () => {
      vi.spyOn(Network, 'listAllRooms').mockResolvedValue([new RoomInfo('abc', 'first')]);

      await expect(service.findRoom('xyz')).resolves.toBeNull();
    });
  });

  describe('join', () => {
    it('接続先が空なら何もせず false を返す', async () => {
      await expect(service.join([], '')).resolves.toBe(false);
      expect(Network.open).not.toHaveBeenCalled();
    });

    it('部屋を開いてから既存ピアすべてに接続する', async () => {
      const peers = [peerContext('peer-1', 'abc', 'room'), peerContext('peer-2', 'abc', 'room')];
      void service.join(peers, 'pw');

      expect(Network.open).toHaveBeenCalledWith('user', 'abc', 'room', 'pw');
      expect(Network.connect).not.toHaveBeenCalled();

      stubChange.networkOpen$.emit({ peerId: 'my-peer' });
      expect(Network.connect).toHaveBeenCalledTimes(2);
    });

    it('全ピアの試行が終わり接続が残っていれば true を返す', async () => {
      const peers = [peerContext('peer-1', 'abc', 'room'), peerContext('peer-2', 'abc', 'room')];
      const joined = service.join(peers, '');
      stubChange.networkOpen$.emit({ peerId: 'my-peer' });

      connectedPeers = [peers[0]];
      stubChange.peerConnect$.emit({ peerId: 'peer-1' });
      stubChange.peerDisconnect$.emit({ peerId: 'peer-2' });

      await expect(joined).resolves.toBe(true);
      expect(Network.openStandby).not.toHaveBeenCalled();
    });

    it('誰にも接続できなければ待機状態に戻して false を返す', async () => {
      const peers = [peerContext('peer-1', 'abc', 'room')];
      const joined = service.join(peers, '');
      stubChange.networkOpen$.emit({ peerId: 'my-peer' });

      stubChange.peerDisconnect$.emit({ peerId: 'peer-1' });

      await expect(joined).resolves.toBe(false);
      expect(Network.openStandby).toHaveBeenCalledOnce();
    });

    it('応答が無いままでもタイムアウトで決着する', async () => {
      vi.useFakeTimers();
      const joined = service.join([peerContext('peer-1', 'abc', 'room')], '');
      stubChange.networkOpen$.emit({ peerId: 'my-peer' });

      await vi.advanceTimersByTimeAsync(15_000);

      await expect(joined).resolves.toBe(false);
      vi.useRealTimers();
    });

    it('一度決着したあとのピアイベントで二重に解決しない', async () => {
      const peers = [peerContext('peer-1', 'abc', 'room')];
      connectedPeers = [peers[0]];
      const joined = service.join(peers, '');
      stubChange.networkOpen$.emit({ peerId: 'my-peer' });

      stubChange.peerConnect$.emit({ peerId: 'peer-1' });
      stubChange.peerConnect$.emit({ peerId: 'peer-1' });

      await expect(joined).resolves.toBe(true);
    });
  });
});
