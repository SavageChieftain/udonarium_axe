import { TestBed } from '@angular/core/testing';
import { localDispatch } from '@axe/core/network/network-messaging';
import { childrenChanged$, objectAdded$, objectChanged$, objectRemoved$ } from '@axe/core/sync/object-event-extension';
import { firstValueFrom } from 'rxjs';
import { Subject } from 'rxjs';

import { NetworkPeerEvent, ObjectChangeService, ObjectDeleteEvent } from './object-change.service';

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

  it('should emit on objectChanged$ when objectChanged$ Subject fires', async () => {
    const testData = { identifier: 'test-id', aliasName: 'TestAlias', isSendFromSelf: false };
    const promise = firstValueFrom(service.objectChanged$);
    objectChanged$.next(testData);
    const event = await promise;
    expect(event.identifier).toBe('test-id');
    expect(event.aliasName).toBe('TestAlias');
  });

  it('should emit on childrenChanged$ when childrenChanged$ Subject fires', async () => {
    const testData = { identifier: 'child-id' };
    const promise = firstValueFrom(service.childrenChanged$);
    childrenChanged$.next(testData);
    const event = await promise;
    expect(event.identifier).toBe('child-id');
  });

  it('should emit on objectDeleted$ when _objectDeleted$ fires', async () => {
    const promise = firstValueFrom(service.objectDeleted$);
    (service as unknown as { _objectDeleted$: Subject<ObjectDeleteEvent> })._objectDeleted$.next({
      identifier: 'del-id',
      aliasName: 'GameCharacter',
      isSendFromSelf: true,
    });
    const event = await promise;
    expect(event.identifier).toBe('del-id');
    expect(event.aliasName).toBe('GameCharacter');
  });

  it('should emit on peerConnect$ when _peerConnect$ fires', async () => {
    const promise = firstValueFrom(service.peerConnect$);
    (service as unknown as { _peerConnect$: Subject<NetworkPeerEvent> })._peerConnect$.next({ peerId: 'peer-123' });
    const event = await promise;
    expect(event.peerId).toBe('peer-123');
  });

  it('should emit on peerDisconnect$ when _peerDisconnect$ fires', async () => {
    const promise = firstValueFrom(service.peerDisconnect$);
    (service as unknown as { _peerDisconnect$: Subject<NetworkPeerEvent> })._peerDisconnect$.next({
      peerId: 'peer-456',
    });
    const event = await promise;
    expect(event.peerId).toBe('peer-456');
  });

  it('should emit on networkOpen$ when _networkOpen$ fires', async () => {
    const promise = firstValueFrom(service.networkOpen$);
    (service as unknown as { _networkOpen$: Subject<NetworkPeerEvent> })._networkOpen$.next({ peerId: 'my-peer' });
    const event = await promise;
    expect(event.peerId).toBe('my-peer');
  });

  it('DELETE_GAME_OBJECT を受信すると objectDeleted$ に変換される', async () => {
    const promise = firstValueFrom(service.objectDeleted$);

    localDispatch('DELETE_GAME_OBJECT', { identifier: 'network-del-id', aliasName: 'character' }, 'remote-peer-id');

    await expect(promise).resolves.toEqual({
      identifier: 'network-del-id',
      aliasName: 'character',
      isSendFromSelf: false,
    });
  });

  it('CURSOR_MOVE を受信すると cursorMove$ に変換される', async () => {
    const promise = firstValueFrom(service.cursorMove$);

    localDispatch('CURSOR_MOVE', [10, 20, 30], 'remote-peer-id');

    await expect(promise).resolves.toEqual({
      x: 10,
      y: 20,
      z: 30,
      sendFrom: 'remote-peer-id',
    });
  });

  it('NETWORK_ERROR を受信すると networkError$ に変換される', async () => {
    const promise = firstValueFrom(service.networkError$);

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

      objectChanged$.next({ identifier: 'obj-changed-1', aliasName: 'TestAlias', isSendFromSelf: true });

      expect(sig()).toBe(1);
    });

    it('objectChanged$ が emit されても無関係な identifier の version は変わらない', () => {
      const sigTarget = service.versionOf('obj-changed-2a');
      const sigOther = service.versionOf('obj-changed-2b');

      objectChanged$.next({ identifier: 'obj-changed-2a', aliasName: 'TestAlias', isSendFromSelf: true });

      expect(sigTarget()).toBe(1);
      expect(sigOther()).toBe(0);
    });

    it('childrenChanged$ が emit されると該当 identifier の version が increment される', () => {
      const sig = service.versionOf('parent-1');
      expect(sig()).toBe(0);

      childrenChanged$.next({ identifier: 'parent-1' });

      expect(sig()).toBe(1);
    });

    it('objectChanged$ と childrenChanged$ が連続で emit されると version が累積する', () => {
      const sig = service.versionOf('combo-1');

      objectChanged$.next({ identifier: 'combo-1', aliasName: 'TestAlias', isSendFromSelf: true });
      childrenChanged$.next({ identifier: 'combo-1' });

      expect(sig()).toBe(2);
    });

    it('versionOf 未登録の identifier への objectChanged$ は無視される（エラーにならない）', () => {
      // versionOf を呼ばずに objectChanged$ を emit しても例外が発生しないこと
      expect(() => {
        objectChanged$.next({ identifier: 'unregistered-1', aliasName: 'TestAlias', isSendFromSelf: true });
      }).not.toThrow();
    });

    it('objectRemoved$ が emit されると該当 identifier の Signal がクリーンアップされる', () => {
      const sig1 = service.versionOf('cleanup-1');
      expect(sig1()).toBe(0);

      objectRemoved$.next({ identifier: 'cleanup-1', aliasName: 'TestAlias' });

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

      objectAdded$.next({ identifier: 'char-1', aliasName: 'character' });

      expect(sig()).toBe(1);
    });

    it('objectAdded$ が emit されても無関係な aliasName の collection は変わらない', () => {
      const sigTarget = service.collectionOf('character');
      const sigOther = service.collectionOf('card');

      objectAdded$.next({ identifier: 'char-2', aliasName: 'character' });

      expect(sigTarget()).toBe(1);
      expect(sigOther()).toBe(0);
    });

    it('objectRemoved$ が emit されると該当 aliasName の collection が increment される', () => {
      const sig = service.collectionOf('character');

      objectRemoved$.next({ identifier: 'char-3', aliasName: 'character' });

      expect(sig()).toBe(1);
    });

    it('add と remove で version が累積する', () => {
      const sig = service.collectionOf('card-stack');

      objectAdded$.next({ identifier: 'cs-1', aliasName: 'card-stack' });
      objectAdded$.next({ identifier: 'cs-2', aliasName: 'card-stack' });
      objectRemoved$.next({ identifier: 'cs-1', aliasName: 'card-stack' });

      expect(sig()).toBe(3);
    });

    it('collectionOf 未登録の aliasName への objectAdded$ は無視される（エラーにならない）', () => {
      expect(() => {
        objectAdded$.next({ identifier: 'x', aliasName: 'unregistered-alias' });
      }).not.toThrow();
    });

    it('読み取り専用のSignalを返す（asReadonly）', () => {
      const sig = service.collectionOf('readonly-alias');
      expect(typeof (sig as unknown as Record<string, unknown>)['set']).not.toBe('function');
      expect(typeof (sig as unknown as Record<string, unknown>)['update']).not.toBe('function');
    });
  });
});
