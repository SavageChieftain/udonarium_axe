import { TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { type NetworkErrorEvent, type NetworkPeerEvent } from '@axe/application/sync/object-change-network-helpers';
import { EventChannel } from '@axe/core/event/event-channel';
import { Network } from '@axe/core/network/network';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { NetworkEventHandlerService } from '@axe/features/lobby/network-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

/**
 * networkOpen$ / networkError$ / peerConnect$ は private channel として
 * ObjectChangeService が保持し、networkMessage$ 経由でのみ発火する。
 * テストでは EventChannel をスタブ ObjectChangeService に持たせて直接 emit する。
 */
class StubObjectChange {
  readonly loadConfig$ = new EventChannel<{ config: unknown }>();
  readonly networkOpen$ = new EventChannel<NetworkPeerEvent>();
  readonly networkError$ = new EventChannel<NetworkErrorEvent>();
  readonly peerConnect$ = new EventChannel<NetworkPeerEvent>();
  onObjectChangedForAlias(): () => void {
    return () => {};
  }
}

describe('NetworkEventHandlerService', () => {
  let chatStub: {
    sendSystemMessage: ReturnType<typeof vi.fn>;
    calibrateTimeOffset: ReturnType<typeof vi.fn>;
  };
  let stubChange: StubObjectChange;

  beforeEach(() => {
    chatStub = {
      sendSystemMessage: vi.fn(),
      calibrateTimeOffset: vi.fn(),
    };
    stubChange = new StubObjectChange();
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(ChatMessageService, { useValue: chatStub });
    TestBed.overrideProvider(ObjectChangeService, { useValue: stubChange });
    TestBed.inject(NetworkEventHandlerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('networkOpen で PeerCursor.myCursor に peerId / userId を反映', () => {
    PeerCursor.myCursor = new PeerCursor();
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({
      peerId: 'p123',
      userId: 'u456',
    } as never);

    stubChange.networkOpen$.emit({ peerId: 'p123' });

    expect(PeerCursor.myCursor.peerId).toBe('p123');
    expect(PeerCursor.myCursor.userId).toBe('u456');
  });

  it('peerConnect で chatMessageService.calibrateTimeOffset を呼ぶ', () => {
    stubChange.peerConnect$.emit({ peerId: 'p1' });

    expect(chatStub.calibrateTimeOffset).toHaveBeenCalledTimes(1);
  });

  it('networkError: peer-unavailable は静かに無視（chat も再接続もしない）', () => {
    const openStandbySpy = vi.spyOn(Network, 'openStandby').mockImplementation(() => {});

    stubChange.networkError$.emit({ errorType: 'peer-unavailable', errorMessage: '' });

    expect(chatStub.sendSystemMessage).not.toHaveBeenCalled();
    expect(openStandbySpy).not.toHaveBeenCalled();
  });

  it('networkError: server-error は上限内ならバックオフ後に自動再接続する', async () => {
    vi.useFakeTimers();
    try {
      const openStandbySpy = vi.spyOn(Network, 'openStandby').mockImplementation(() => {});

      stubChange.networkError$.emit({ errorType: 'server-error', errorMessage: 'oops' });

      // 即時は再接続案内のみで、再接続はバックオフ後
      expect(chatStub.sendSystemMessage).toHaveBeenCalledTimes(1);
      expect(chatStub.sendSystemMessage.mock.calls[0][0]).toContain('feature.lobby.errors.reconnecting');
      expect(openStandbySpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(3000);
      expect(openStandbySpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('networkError: server-error が上限を超えると打ち切り、サーバエラーを通知する', async () => {
    vi.useFakeTimers();
    try {
      const openStandbySpy = vi.spyOn(Network, 'openStandby').mockImplementation(() => {});

      // 上限（3回）まで再接続。各回バックオフを流して openStandby を発火
      for (let i = 0; i < 3; i++) {
        stubChange.networkError$.emit({ errorType: 'server-error', errorMessage: 'x' });
        await vi.advanceTimersByTimeAsync(20000);
      }
      expect(openStandbySpy).toHaveBeenCalledTimes(3);

      // 4 回目は打ち切り：サーバエラー通知のみ、再接続はしない
      stubChange.networkError$.emit({ errorType: 'server-error', errorMessage: 'x' });
      await vi.advanceTimersByTimeAsync(20000);

      expect(openStandbySpy).toHaveBeenCalledTimes(3);
      const lastMessage = chatStub.sendSystemMessage.mock.calls.at(-1)?.[0] as string;
      expect(lastMessage).toContain('feature.lobby.errors.skywayServer');
    } finally {
      vi.useRealTimers();
    }
  });

  it('networkError: 接続成功(networkOpen)で server-error の再接続回数がリセットされる', async () => {
    vi.useFakeTimers();
    try {
      PeerCursor.myCursor = new PeerCursor();
      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({
        peerId: 'p',
        userId: 'u',
        roomId: '',
        roomName: '',
        isRoom: false,
      } as never);
      const openStandbySpy = vi.spyOn(Network, 'openStandby').mockImplementation(() => {});

      for (let i = 0; i < 3; i++) {
        stubChange.networkError$.emit({ errorType: 'server-error', errorMessage: 'x' });
        await vi.advanceTimersByTimeAsync(20000);
      }
      expect(openStandbySpy).toHaveBeenCalledTimes(3);

      stubChange.networkOpen$.emit({ peerId: 'p' });

      // リセット後は再び再接続できる（打ち切られない）
      stubChange.networkError$.emit({ errorType: 'server-error', errorMessage: 'x' });
      await vi.advanceTimersByTimeAsync(20000);
      expect(openStandbySpy).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('networkError: token-expired はメッセージ + 再接続', () => {
    const openStandbySpy = vi.spyOn(Network, 'openStandby').mockImplementation(() => {});

    stubChange.networkError$.emit({ errorType: 'token-expired', errorMessage: '' });

    expect(chatStub.sendSystemMessage).toHaveBeenCalledTimes(2);
    expect(openStandbySpy).toHaveBeenCalledTimes(1);
  });

  it('loadConfig で Network.configure と openStandby が呼ばれる', () => {
    const configureSpy = vi.spyOn(Network, 'configure').mockImplementation(() => {});
    const openStandbySpy = vi.spyOn(Network, 'openStandby').mockImplementation(() => {});

    stubChange.loadConfig$.emit({ config: { foo: 'bar' } });

    expect(configureSpy).toHaveBeenCalledWith({ foo: 'bar' });
    expect(openStandbySpy).toHaveBeenCalledTimes(1);
  });
});
