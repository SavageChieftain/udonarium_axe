import { localDispatch, networkMessage$ } from '@axe/core/network/network-messaging';
import {
  completeSubjects,
  createObjectChangeNetworkBindings,
  type CursorMoveEvent,
  type FileSyncEvent,
  type HeartBeatEvent,
  type IdentifierEvent,
  type NetworkErrorEvent,
  type NetworkPeerEvent,
  type ObjectDeleteEvent,
  subscribeNetworkBindings,
  type WritingMessageEvent,
} from '@axe/shared/sync/object-change-network-helpers';
import { firstValueFrom, Subject } from 'rxjs';

describe('object-change-network-helpers', () => {
  it('ObjectChangeService 用の network binding 定義を生成する', () => {
    const objectDeleted$ = new Subject<ObjectDeleteEvent>();
    const fileSyncList$ = new Subject<FileSyncEvent>();
    const fileResourceUpdated$ = new Subject<FileSyncEvent>();
    const peerConnect$ = new Subject<NetworkPeerEvent>();
    const peerDisconnect$ = new Subject<NetworkPeerEvent>();
    const networkOpen$ = new Subject<NetworkPeerEvent>();
    const writingMessage$ = new Subject<WritingMessageEvent>();
    const shuffleCardStack$ = new Subject<IdentifierEvent>();
    const rollDiceSymbol$ = new Subject<IdentifierEvent>();
    const cursorMove$ = new Subject<CursorMoveEvent>();
    const heartBeat$ = new Subject<HeartBeatEvent>();
    const localObjectUpdated$ = new Subject<void>();
    const audioSyncList$ = new Subject<FileSyncEvent>();
    const networkError$ = new Subject<NetworkErrorEvent>();

    const bindings = createObjectChangeNetworkBindings({
      objectDeleted$,
      fileSyncList$,
      fileResourceUpdated$,
      peerConnect$,
      peerDisconnect$,
      networkOpen$,
      writingMessage$,
      shuffleCardStack$,
      rollDiceSymbol$,
      cursorMove$,
      heartBeat$,
      localObjectUpdated$,
      audioSyncList$,
      networkError$,
    });

    expect(bindings.map((binding) => binding.eventName)).toEqual([
      'DELETE_GAME_OBJECT',
      'SYNCHRONIZE_FILE_LIST',
      'UPDATE_FILE_RESOURE',
      'CONNECT_PEER',
      'DISCONNECT_PEER',
      'OPEN_NETWORK',
      'WRITING_A_MESSAGE',
      'SHUFFLE_CARD_STACK',
      'ROLL_DICE_SYMBOL',
      'CURSOR_MOVE',
      'HEART_BEAT',
      'LOCAL_OBJECT_UPDATED',
      'SYNCHRONIZE_AUDIO_LIST',
      'NETWORK_ERROR',
    ]);
  });

  it('binding 定義を購読すると eventName に応じて payload が変換される', async () => {
    const objectDeleted$ = new Subject<ObjectDeleteEvent>();
    const peerConnect$ = new Subject<NetworkPeerEvent>();
    const writingMessage$ = new Subject<WritingMessageEvent>();
    const cursorMove$ = new Subject<CursorMoveEvent>();
    const networkError$ = new Subject<NetworkErrorEvent>();

    const subscriptions = subscribeNetworkBindings(
      networkMessage$,
      createObjectChangeNetworkBindings({
        objectDeleted$,
        fileSyncList$: new Subject<FileSyncEvent>(),
        fileResourceUpdated$: new Subject<FileSyncEvent>(),
        peerConnect$,
        peerDisconnect$: new Subject<NetworkPeerEvent>(),
        networkOpen$: new Subject<NetworkPeerEvent>(),
        writingMessage$,
        shuffleCardStack$: new Subject<IdentifierEvent>(),
        rollDiceSymbol$: new Subject<IdentifierEvent>(),
        cursorMove$,
        heartBeat$: new Subject<HeartBeatEvent>(),
        localObjectUpdated$: new Subject<void>(),
        audioSyncList$: new Subject<FileSyncEvent>(),
        networkError$,
      })
    );

    try {
      const deletePromise = firstValueFrom(objectDeleted$);
      const peerPromise = firstValueFrom(peerConnect$);
      const writingPromise = firstValueFrom(writingMessage$);
      const cursorPromise = firstValueFrom(cursorMove$);
      const errorPromise = firstValueFrom(networkError$);

      localDispatch('DELETE_GAME_OBJECT', { identifier: 'del-1', aliasName: 'character' }, 'remote-peer');
      localDispatch('CONNECT_PEER', { peerId: 'peer-1' }, 'remote-peer');
      localDispatch('WRITING_A_MESSAGE', 'tab-1', 'remote-peer');
      localDispatch('CURSOR_MOVE', [1, 2, 3], 'remote-peer');
      localDispatch('NETWORK_ERROR', { errorType: 'disconnect', errorMessage: 'failed' }, 'remote-peer');

      await expect(deletePromise).resolves.toEqual({
        identifier: 'del-1',
        aliasName: 'character',
        isSendFromSelf: false,
      });
      await expect(peerPromise).resolves.toEqual({ peerId: 'peer-1' });
      await expect(writingPromise).resolves.toEqual({
        tabIdentifier: 'tab-1',
        sendFrom: 'remote-peer',
        isSendFromSelf: false,
      });
      await expect(cursorPromise).resolves.toEqual({
        x: 1,
        y: 2,
        z: 3,
        sendFrom: 'remote-peer',
      });
      await expect(errorPromise).resolves.toEqual({
        errorType: 'disconnect',
        errorMessage: 'failed',
      });
    } finally {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    }
  });

  it('completeSubjects は渡された Subject を完了する', () => {
    const subjectA = new Subject<void>();
    const subjectB = new Subject<void>();
    const completeA = vi.fn();
    const completeB = vi.fn();
    subjectA.subscribe({ complete: completeA });
    subjectB.subscribe({ complete: completeB });

    completeSubjects([subjectA, subjectB]);

    expect(completeA).toHaveBeenCalledTimes(1);
    expect(completeB).toHaveBeenCalledTimes(1);
  });
});
