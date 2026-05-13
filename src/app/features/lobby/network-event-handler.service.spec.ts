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

  it('networkError: server-error はメッセージ送信のみで再接続しない', () => {
    const openStandbySpy = vi.spyOn(Network, 'openStandby').mockImplementation(() => {});

    stubChange.networkError$.emit({ errorType: 'server-error', errorMessage: 'oops' });

    expect(chatStub.sendSystemMessage).toHaveBeenCalledTimes(1);
    expect(chatStub.sendSystemMessage.mock.calls[0][0]).toContain('SkyWay');
    expect(openStandbySpy).not.toHaveBeenCalled();
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
