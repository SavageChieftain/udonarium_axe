import { TestBed } from '@angular/core/testing';
import { NetworkPeerEvent, ObjectChangeService, ObjectDeleteEvent } from '@axe/application/sync/object-change.service';
import { fileLoaded$ } from '@axe/core/event/domain-events';
import { EventChannel } from '@axe/core/event/event-channel';
import { localDispatch } from '@axe/core/network/network-messaging';
import { childrenChanged$, objectAdded$, objectChanged$, objectRemoved$ } from '@axe/core/sync/object-event-extension';

function nextEvent<T>(channel: { subscribe(fn: (e: T) => void): () => void }): Promise<T> {
  return new Promise<T>((resolve) => {
    const off = channel.subscribe((e) => {
      off();
      resolve(e);
    });
  });
}

describe('ObjectChangeService', () => {
  let service: ObjectChangeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ObjectChangeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose objectChanged$ observable', () => {
    expect(service.objectChanged$).toBeTruthy();
  });

  it('should expose childrenChanged$ observable', () => {
    expect(service.childrenChanged$).toBeTruthy();
  });

  it('should expose objectDeleted$ observable', () => {
    expect(service.objectDeleted$).toBeTruthy();
  });

  it('should expose fileSyncList$ observable', () => {
    expect(service.fileSyncList$).toBeTruthy();
  });

  it('should expose fileResourceUpdated$ observable', () => {
    expect(service.fileResourceUpdated$).toBeTruthy();
  });

  it('should expose peerConnect$ observable', () => {
    expect(service.peerConnect$).toBeTruthy();
  });

  it('should expose peerDisconnect$ observable', () => {
    expect(service.peerDisconnect$).toBeTruthy();
  });

  it('should expose networkOpen$ observable', () => {
    expect(service.networkOpen$).toBeTruthy();
  });

  it('should expose objectAdded$ observable', () => {
    expect(service.objectAdded$).toBeTruthy();
  });

  it('should expose objectRemoved$ observable', () => {
    expect(service.objectRemoved$).toBeTruthy();
  });

  it('should emit on objectChanged$ when objectChanged$ fires', async () => {
    const testData = { identifier: 'test-id', aliasName: 'TestAlias', isSendFromSelf: false };
    const promise = nextEvent(service.objectChanged$);
    objectChanged$.emit(testData);
    const event = await promise;
    expect(event.identifier).toBe('test-id');
    expect(event.aliasName).toBe('TestAlias');
  });

  it('should emit on childrenChanged$ when childrenChanged$ fires', async () => {
    const testData = { identifier: 'child-id' };
    const promise = nextEvent(service.childrenChanged$);
    childrenChanged$.emit(testData);
    const event = await promise;
    expect(event.identifier).toBe('child-id');
  });

  it('should emit on objectDeleted$ when _objectDeleted$ fires', async () => {
    const promise = nextEvent(service.objectDeleted$);
    (service as unknown as { _objectDeleted$: EventChannel<ObjectDeleteEvent> })._objectDeleted$.emit({
      identifier: 'del-id',
      aliasName: 'GameCharacter',
      isSendFromSelf: true,
    });
    const event = await promise;
    expect(event.identifier).toBe('del-id');
    expect(event.aliasName).toBe('GameCharacter');
  });

  it('should emit on peerConnect$ when _peerConnect$ fires', async () => {
    const promise = nextEvent(service.peerConnect$);
    (service as unknown as { _peerConnect$: EventChannel<NetworkPeerEvent> })._peerConnect$.emit({
      peerId: 'peer-123',
    });
    const event = await promise;
    expect(event.peerId).toBe('peer-123');
  });

  it('should emit on peerDisconnect$ when _peerDisconnect$ fires', async () => {
    const promise = nextEvent(service.peerDisconnect$);
    (service as unknown as { _peerDisconnect$: EventChannel<NetworkPeerEvent> })._peerDisconnect$.emit({
      peerId: 'peer-456',
    });
    const event = await promise;
    expect(event.peerId).toBe('peer-456');
  });

  it('should emit on networkOpen$ when _networkOpen$ fires', async () => {
    const promise = nextEvent(service.networkOpen$);
    (service as unknown as { _networkOpen$: EventChannel<NetworkPeerEvent> })._networkOpen$.emit({ peerId: 'my-peer' });
    const event = await promise;
    expect(event.peerId).toBe('my-peer');
  });

  it('DELETE_GAME_OBJECT を受信すると objectDeleted$ に変換される', async () => {
    const promise = nextEvent(service.objectDeleted$);

    localDispatch('DELETE_GAME_OBJECT', { identifier: 'network-del-id', aliasName: 'character' }, 'remote-peer-id');

    await expect(promise).resolves.toEqual({
      identifier: 'network-del-id',
      aliasName: 'character',
      isSendFromSelf: false,
    });
  });

  it('CURSOR_MOVE を受信すると cursorMove$ に変換される', async () => {
    const promise = nextEvent(service.cursorMove$);

    localDispatch('CURSOR_MOVE', [10, 20, 30], 'remote-peer-id');

    await expect(promise).resolves.toEqual({
      x: 10,
      y: 20,
      z: 30,
      sendFrom: 'remote-peer-id',
    });
  });

  it('NETWORK_ERROR を受信すると networkError$ に変換される', async () => {
    const promise = nextEvent(service.networkError$);

    localDispatch('NETWORK_ERROR', { errorType: 'disconnect', errorMessage: 'connection lost' });

    await expect(promise).resolves.toEqual({
      errorType: 'disconnect',
      errorMessage: 'connection lost',
    });
  });

  describe('versionOf()', () => {
    it('メソッドが公開されている', () => {
      expect(typeof service.versionOf).toBe('function');
    });

    it('初回呼び出しで Signal を返す（初期値 0）', () => {
      const sig = service.versionOf('test-id-1');
      expect(sig()).toBe(0);
    });

    it('同じ identifier に対しては同じ Signal を返す', () => {
      const sig1 = service.versionOf('test-id-2');
      const sig2 = service.versionOf('test-id-2');
      expect(sig1).toBe(sig2);
    });

    it('異なる identifier に対しては異なる Signal を返す', () => {
      const sig1 = service.versionOf('test-id-3a');
      const sig2 = service.versionOf('test-id-3b');
      expect(sig1).not.toBe(sig2);
    });

    it('objectChanged$ が emit されると該当 identifier の version が increment される', () => {
      const sig = service.versionOf('obj-changed-1');
      expect(sig()).toBe(0);

      objectChanged$.emit({ identifier: 'obj-changed-1', aliasName: 'TestAlias', isSendFromSelf: true });

      expect(sig()).toBe(1);
    });

    it('objectChanged$ が emit されても無関係な identifier の version は変わらない', () => {
      const sigTarget = service.versionOf('obj-changed-2a');
      const sigOther = service.versionOf('obj-changed-2b');

      objectChanged$.emit({ identifier: 'obj-changed-2a', aliasName: 'TestAlias', isSendFromSelf: true });

      expect(sigTarget()).toBe(1);
      expect(sigOther()).toBe(0);
    });

    it('childrenChanged$ が emit されると該当 identifier の version が increment される', () => {
      const sig = service.versionOf('parent-1');
      expect(sig()).toBe(0);

      childrenChanged$.emit({ identifier: 'parent-1' });

      expect(sig()).toBe(1);
    });

    it('objectChanged$ と childrenChanged$ が連続で emit されると version が累積する', () => {
      const sig = service.versionOf('combo-1');

      objectChanged$.emit({ identifier: 'combo-1', aliasName: 'TestAlias', isSendFromSelf: true });
      childrenChanged$.emit({ identifier: 'combo-1' });

      expect(sig()).toBe(2);
    });

    it('versionOf 未登録の identifier への objectChanged$ は無視される（エラーにならない）', () => {
      // versionOf を呼ばずに objectChanged$ を emit しても例外が発生しないこと
      expect(() => {
        objectChanged$.emit({ identifier: 'unregistered-1', aliasName: 'TestAlias', isSendFromSelf: true });
      }).not.toThrow();
    });

    it('objectRemoved$ が emit されると該当 identifier の Signal がクリーンアップされる', () => {
      const sig1 = service.versionOf('cleanup-1');
      expect(sig1()).toBe(0);

      objectRemoved$.emit({ identifier: 'cleanup-1', aliasName: 'TestAlias' });

      // 再呼び出しすると新しいSignalが返される（version 0 にリセット）
      const sig2 = service.versionOf('cleanup-1');
      expect(sig2()).toBe(0);
      expect(sig2).not.toBe(sig1);
    });

    it('読み取り専用のSignalを返す（asReadonly）', () => {
      const sig = service.versionOf('readonly-1');
      // WritableSignal ではなく Signal（set/update メソッドがない）
      expect(typeof (sig as unknown as Record<string, unknown>)['set']).not.toBe('function');
      expect(typeof (sig as unknown as Record<string, unknown>)['update']).not.toBe('function');
    });
  });

  describe('collectionOf()', () => {
    it('メソッドが公開されている', () => {
      expect(typeof service.collectionOf).toBe('function');
    });

    it('初回呼び出しで Signal を返す（初期値 0）', () => {
      const sig = service.collectionOf('test-alias-1');
      expect(sig()).toBe(0);
    });

    it('同じ aliasName に対しては同じ Signal を返す', () => {
      const sig1 = service.collectionOf('test-alias-2');
      const sig2 = service.collectionOf('test-alias-2');
      expect(sig1).toBe(sig2);
    });

    it('objectAdded$ が emit されると該当 aliasName の collection が increment される', () => {
      const sig = service.collectionOf('character');
      expect(sig()).toBe(0);

      objectAdded$.emit({ identifier: 'char-1', aliasName: 'character' });

      expect(sig()).toBe(1);
    });

    it('objectAdded$ が emit されても無関係な aliasName の collection は変わらない', () => {
      const sigTarget = service.collectionOf('character');
      const sigOther = service.collectionOf('card');

      objectAdded$.emit({ identifier: 'char-2', aliasName: 'character' });

      expect(sigTarget()).toBe(1);
      expect(sigOther()).toBe(0);
    });

    it('objectRemoved$ が emit されると該当 aliasName の collection が increment される', () => {
      const sig = service.collectionOf('character');

      objectRemoved$.emit({ identifier: 'char-3', aliasName: 'character' });

      expect(sig()).toBe(1);
    });

    it('add と remove で version が累積する', () => {
      const sig = service.collectionOf('card-stack');

      objectAdded$.emit({ identifier: 'cs-1', aliasName: 'card-stack' });
      objectAdded$.emit({ identifier: 'cs-2', aliasName: 'card-stack' });
      objectRemoved$.emit({ identifier: 'cs-1', aliasName: 'card-stack' });

      expect(sig()).toBe(3);
    });

    it('collectionOf 未登録の aliasName への objectAdded$ は無視される（エラーにならない）', () => {
      expect(() => {
        objectAdded$.emit({ identifier: 'x', aliasName: 'unregistered-alias' });
      }).not.toThrow();
    });

    it('読み取り専用のSignalを返す（asReadonly）', () => {
      const sig = service.collectionOf('readonly-alias');
      expect(typeof (sig as unknown as Record<string, unknown>)['set']).not.toBe('function');
      expect(typeof (sig as unknown as Record<string, unknown>)['update']).not.toBe('function');
    });
  });

  describe('notifyChanged()', () => {
    it('versionOf を呼び出した後に notifyChanged を呼ぶと signal が increment される', () => {
      const sig = service.versionOf('notify-1');
      expect(sig()).toBe(0);

      service.notifyChanged('notify-1');

      expect(sig()).toBe(1);
    });

    it('複数回呼び出すと版数が累積する', () => {
      const sig = service.versionOf('notify-2');

      service.notifyChanged('notify-2');
      service.notifyChanged('notify-2');
      service.notifyChanged('notify-2');

      expect(sig()).toBe(3);
    });

    it('versionOf 未登録の identifier に対して呼び出してもエラーにならない', () => {
      expect(() => {
        service.notifyChanged('notify-unregistered');
      }).not.toThrow();
    });

    it('無関係な identifier の signal には影響しない', () => {
      const sigTarget = service.versionOf('notify-3a');
      const sigOther = service.versionOf('notify-3b');

      service.notifyChanged('notify-3a');

      expect(sigTarget()).toBe(1);
      expect(sigOther()).toBe(0);
    });
  });

  describe('fileVersion throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('最初のファイルイベントで即座に fileVersion が increment される（leading edge）', () => {
      expect(service.fileVersion()).toBe(0);

      fileLoaded$.emit();

      expect(service.fileVersion()).toBe(1);
    });

    it('100ms 以内の連続イベントでは leading edge のみ即座に反映される', () => {
      fileLoaded$.emit(); // leading
      expect(service.fileVersion()).toBe(1);

      fileLoaded$.emit(); // throttled
      expect(service.fileVersion()).toBe(1);

      fileLoaded$.emit(); // throttled
      expect(service.fileVersion()).toBe(1);
    });

    it('100ms 経過後に trailing edge が発火する', () => {
      fileLoaded$.emit(); // leading
      fileLoaded$.emit(); // pending

      vi.advanceTimersByTime(100);

      expect(service.fileVersion()).toBe(2); // trailing
    });

    it('trailing edge 後にクールダウンが終われば新しい leading edge が発火できる', () => {
      fileLoaded$.emit(); // leading → 1
      fileLoaded$.emit(); // pending

      vi.advanceTimersByTime(100); // trailing → 2 (starts new cooldown)
      vi.advanceTimersByTime(100); // cooldown expires (no pending → no trailing)

      fileLoaded$.emit(); // leading → 3
      expect(service.fileVersion()).toBe(3);
    });

    it('単発イベントでは trailing edge は発火しない', () => {
      fileLoaded$.emit(); // leading → 1
      expect(service.fileVersion()).toBe(1);

      vi.advanceTimersByTime(100);

      expect(service.fileVersion()).toBe(1); // no trailing
    });
  });

  describe('onObjectChangedFor()', () => {
    it('getIdentifiers が返した id にマッチするイベントだけ listener を呼ぶ', () => {
      const listener = vi.fn();
      service.onObjectChangedFor(() => ['id-A', 'id-B'], listener);

      objectChanged$.emit({ identifier: 'id-A', aliasName: 'alias', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'id-X', aliasName: 'alias', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'id-B', aliasName: 'alias', isSendFromSelf: false });

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener.mock.calls[0][0].identifier).toBe('id-A');
      expect(listener.mock.calls[1][0].identifier).toBe('id-B');
    });

    it('getIdentifiers は毎イベント時に評価される（動的 id 対応）', () => {
      const listener = vi.fn();
      let currentIds = ['id-A'];
      service.onObjectChangedFor(() => currentIds, listener);

      objectChanged$.emit({ identifier: 'id-A', aliasName: 'a', isSendFromSelf: false });
      currentIds = ['id-B'];
      objectChanged$.emit({ identifier: 'id-A', aliasName: 'a', isSendFromSelf: false }); // 旧 id にもう一致しない
      objectChanged$.emit({ identifier: 'id-B', aliasName: 'a', isSendFromSelf: false });

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('返り値の unsubscribe で listener が解除される', () => {
      const listener = vi.fn();
      const off = service.onObjectChangedFor(() => ['x'], listener);
      objectChanged$.emit({ identifier: 'x', aliasName: 'a', isSendFromSelf: false });
      off();
      objectChanged$.emit({ identifier: 'x', aliasName: 'a', isSendFromSelf: false });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('onObjectChangedForAlias()', () => {
    it('aliasName にマッチするイベントだけ listener を呼ぶ', () => {
      const listener = vi.fn();
      service.onObjectChangedForAlias(['ChatMessage'], listener);

      objectChanged$.emit({ identifier: 'a', aliasName: 'ChatMessage', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'b', aliasName: 'Card', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'c', aliasName: 'ChatMessage', isSendFromSelf: false });

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('複数 aliasName 指定で OR フィルタになる', () => {
      const listener = vi.fn();
      service.onObjectChangedForAlias(['ChatTab', 'ChatTabList'], listener);
      objectChanged$.emit({ identifier: 'a', aliasName: 'ChatTab', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'b', aliasName: 'ChatTabList', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'c', aliasName: 'OtherType', isSendFromSelf: false });
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('onObjectChangedForIdentifier()', () => {
    it('指定 identifier のイベントだけ listener を呼ぶ (indexed dispatch)', () => {
      const listener = vi.fn();
      service.onObjectChangedForIdentifier('id-A', listener);

      objectChanged$.emit({ identifier: 'id-A', aliasName: 'a', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'id-B', aliasName: 'a', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'id-A', aliasName: 'a', isSendFromSelf: false });

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('同一 identifier に複数 listener を登録できる', () => {
      const a = vi.fn();
      const b = vi.fn();
      service.onObjectChangedForIdentifier('id-X', a);
      service.onObjectChangedForIdentifier('id-X', b);
      objectChanged$.emit({ identifier: 'id-X', aliasName: 'a', isSendFromSelf: false });
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });

    it('返り値の unsubscribe で indexed entry が解除される', () => {
      const listener = vi.fn();
      const off = service.onObjectChangedForIdentifier('id-Y', listener);
      objectChanged$.emit({ identifier: 'id-Y', aliasName: 'a', isSendFromSelf: false });
      off();
      objectChanged$.emit({ identifier: 'id-Y', aliasName: 'a', isSendFromSelf: false });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('iteration 中に同じ identifier の listener が解除されてもクラッシュしない', () => {
      const order: string[] = [];
      let offB: (() => void) | null = null;
      const a = vi.fn(() => {
        order.push('a');
        offB?.();
      });
      const b = vi.fn(() => {
        order.push('b');
      });
      service.onObjectChangedForIdentifier('id-Z', a);
      offB = service.onObjectChangedForIdentifier('id-Z', b);
      objectChanged$.emit({ identifier: 'id-Z', aliasName: 'a', isSendFromSelf: false });
      // a の中で b が解除されたが、snapshot に基づき b は当該 dispatch では呼ばれる
      expect(order).toEqual(['a', 'b']);
    });
  });

  describe('onObjectChangedForSingleAlias()', () => {
    it('指定 alias のイベントだけ listener を呼ぶ (indexed dispatch)', () => {
      const listener = vi.fn();
      service.onObjectChangedForSingleAlias('ChatMessage', listener);

      objectChanged$.emit({ identifier: 'a', aliasName: 'ChatMessage', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'b', aliasName: 'Card', isSendFromSelf: false });
      objectChanged$.emit({ identifier: 'c', aliasName: 'ChatMessage', isSendFromSelf: false });

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('返り値の unsubscribe で indexed entry が解除される', () => {
      const listener = vi.fn();
      const off = service.onObjectChangedForSingleAlias('Card', listener);
      objectChanged$.emit({ identifier: 'a', aliasName: 'Card', isSendFromSelf: false });
      off();
      objectChanged$.emit({ identifier: 'b', aliasName: 'Card', isSendFromSelf: false });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
