import { EventChannel } from '@axe/core/event/event-channel';
import { localDispatch, networkMessage$ } from '@axe/core/network/network-messaging';
import {
  type CursorMoveEvent,
  type FileSyncEvent,
  type HeartBeatEvent,
  type IdentifierEvent,
  type NetworkErrorEvent,
  type NetworkPeerEvent,
  type ObjectChangeNetworkTargets,
  type ObjectDeleteEvent,
  subscribeNetworkBindings,
  type WritingMessageEvent,
} from '@axe/shared/sync/object-change-network-helpers';

function makeTargets(): ObjectChangeNetworkTargets {
  return {
    objectDeleted$: new EventChannel<ObjectDeleteEvent>(),
    fileSyncList$: new EventChannel<FileSyncEvent>(),
    fileResourceUpdated$: new EventChannel<FileSyncEvent>(),
    peerConnect$: new EventChannel<NetworkPeerEvent>(),
    peerDisconnect$: new EventChannel<NetworkPeerEvent>(),
    networkOpen$: new EventChannel<NetworkPeerEvent>(),
    writingMessage$: new EventChannel<WritingMessageEvent>(),
    shuffleCardStack$: new EventChannel<IdentifierEvent>(),
    rollDiceSymbol$: new EventChannel<IdentifierEvent>(),
    cursorMove$: new EventChannel<CursorMoveEvent>(),
    heartBeat$: new EventChannel<HeartBeatEvent>(),
    localObjectUpdated$: new EventChannel<void>(),
    audioSyncList$: new EventChannel<FileSyncEvent>(),
    networkError$: new EventChannel<NetworkErrorEvent>(),
    eventActivity$: new EventChannel<void>(),
  };
}

describe('object-change-network-helpers', () => {
  it('subscribeNetworkBindings は eventName に応じて payload を変換してチャンネルに emit する', async () => {
    const targets = makeTargets();
    const offBindings = subscribeNetworkBindings(networkMessage$, targets);

    const results: {
      delete?: ObjectDeleteEvent;
      peer?: NetworkPeerEvent;
      writing?: WritingMessageEvent;
      cursor?: CursorMoveEvent;
      error?: NetworkErrorEvent;
    } = {};

    const deleteOff = targets.objectDeleted$.subscribe((e) => (results.delete = e));
    const peerOff = targets.peerConnect$.subscribe((e) => (results.peer = e));
    const writingOff = targets.writingMessage$.subscribe((e) => (results.writing = e));
    const cursorOff = targets.cursorMove$.subscribe((e) => (results.cursor = e));
    const errorOff = targets.networkError$.subscribe((e) => (results.error = e));

    try {
      localDispatch('DELETE_GAME_OBJECT', { identifier: 'del-1', aliasName: 'character' }, 'remote-peer');
      localDispatch('CONNECT_PEER', { peerId: 'peer-1' }, 'remote-peer');
      localDispatch('WRITING_A_MESSAGE', 'tab-1', 'remote-peer');
      localDispatch('CURSOR_MOVE', [1, 2, 3], 'remote-peer');
      localDispatch('NETWORK_ERROR', { errorType: 'disconnect', errorMessage: 'failed' }, 'remote-peer');

      expect(results.delete).toEqual({ identifier: 'del-1', aliasName: 'character', isSendFromSelf: false });
      expect(results.peer).toEqual({ peerId: 'peer-1' });
      expect(results.writing).toEqual({ tabIdentifier: 'tab-1', sendFrom: 'remote-peer', isSendFromSelf: false });
      expect(results.cursor).toEqual({ x: 1, y: 2, z: 3, sendFrom: 'remote-peer' });
      expect(results.error).toEqual({ errorType: 'disconnect', errorMessage: 'failed' });
    } finally {
      deleteOff();
      peerOff();
      writingOff();
      cursorOff();
      errorOff();
      offBindings();
    }
  });

  it('cleanup 関数を呼ぶと購読が解除される', () => {
    const targets = makeTargets();
    const offBindings = subscribeNetworkBindings(networkMessage$, targets);

    const received: ObjectDeleteEvent[] = [];
    const offReceive = targets.objectDeleted$.subscribe((e) => received.push(e));

    localDispatch('DELETE_GAME_OBJECT', { identifier: 'first', aliasName: 'char' }, 'peer');
    expect(received).toHaveLength(1);

    offBindings();

    localDispatch('DELETE_GAME_OBJECT', { identifier: 'second', aliasName: 'char' }, 'peer');
    expect(received).toHaveLength(1);

    offReceive();
  });
});
