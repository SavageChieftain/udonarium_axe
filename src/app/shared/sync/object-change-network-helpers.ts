import { NetworkMessage, networkMessage$ } from '@axe/core/network/network-messaging';
import { Observable, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface ObjectDeleteEvent {
  identifier: string;
  aliasName: string;
  isSendFromSelf: boolean;
}

export interface FileSyncEvent {
  isSendFromSelf: boolean;
}

export interface NetworkPeerEvent {
  peerId: string;
}

export interface WritingMessageEvent {
  tabIdentifier: string;
  sendFrom: string;
  isSendFromSelf: boolean;
}

export interface IdentifierEvent {
  identifier: string;
}

export interface CursorMoveEvent {
  x: number;
  y: number;
  z: number;
  sendFrom: string;
}

export interface HeartBeatEvent {
  timestamp: number;
  id: string;
  diffDown: number | null;
  secdCounter: number;
  sendFrom: string;
}

export interface NetworkErrorEvent {
  errorType: string;
  errorMessage: string;
}

export interface ObjectChangeNetworkTargets {
  objectDeleted$: Subject<ObjectDeleteEvent>;
  fileSyncList$: Subject<FileSyncEvent>;
  fileResourceUpdated$: Subject<FileSyncEvent>;
  peerConnect$: Subject<NetworkPeerEvent>;
  peerDisconnect$: Subject<NetworkPeerEvent>;
  networkOpen$: Subject<NetworkPeerEvent>;
  writingMessage$: Subject<WritingMessageEvent>;
  shuffleCardStack$: Subject<IdentifierEvent>;
  rollDiceSymbol$: Subject<IdentifierEvent>;
  cursorMove$: Subject<CursorMoveEvent>;
  heartBeat$: Subject<HeartBeatEvent>;
  localObjectUpdated$: Subject<void>;
  audioSyncList$: Subject<FileSyncEvent>;
  networkError$: Subject<NetworkErrorEvent>;
}

export interface ObjectChangeNetworkBinding {
  eventName: string;
  publish: (message: NetworkMessage) => void;
}

export interface CompletableSubject {
  complete(): void;
}

export function createObjectChangeNetworkBindings(targets: ObjectChangeNetworkTargets): ObjectChangeNetworkBinding[] {
  return [
    {
      eventName: 'DELETE_GAME_OBJECT',
      publish: (message) => {
        const data = message.data as { identifier: string; aliasName: string };
        targets.objectDeleted$.next({
          identifier: data.identifier,
          aliasName: data.aliasName,
          isSendFromSelf: message.isSendFromSelf,
        });
      },
    },
    {
      eventName: 'SYNCHRONIZE_FILE_LIST',
      publish: (message) => {
        targets.fileSyncList$.next({ isSendFromSelf: message.isSendFromSelf });
      },
    },
    {
      eventName: 'UPDATE_FILE_RESOURE',
      publish: (message) => {
        targets.fileResourceUpdated$.next({ isSendFromSelf: message.isSendFromSelf });
      },
    },
    {
      eventName: 'CONNECT_PEER',
      publish: (message) => {
        targets.peerConnect$.next({ peerId: (message.data as { peerId: string }).peerId });
      },
    },
    {
      eventName: 'DISCONNECT_PEER',
      publish: (message) => {
        targets.peerDisconnect$.next({ peerId: (message.data as { peerId: string }).peerId });
      },
    },
    {
      eventName: 'OPEN_NETWORK',
      publish: (message) => {
        targets.networkOpen$.next({ peerId: (message.data as { peerId: string }).peerId });
      },
    },
    {
      eventName: 'WRITING_A_MESSAGE',
      publish: (message) => {
        targets.writingMessage$.next({
          tabIdentifier: message.data as string,
          sendFrom: message.sendFrom,
          isSendFromSelf: message.isSendFromSelf,
        });
      },
    },
    {
      eventName: 'SHUFFLE_CARD_STACK',
      publish: (message) => {
        targets.shuffleCardStack$.next({ identifier: (message.data as { identifier: string }).identifier });
      },
    },
    {
      eventName: 'ROLL_DICE_SYMBOL',
      publish: (message) => {
        targets.rollDiceSymbol$.next({ identifier: (message.data as { identifier: string }).identifier });
      },
    },
    {
      eventName: 'CURSOR_MOVE',
      publish: (message) => {
        const data = message.data as [number, number, number];
        targets.cursorMove$.next({
          x: data[0],
          y: data[1],
          z: data[2],
          sendFrom: message.sendFrom,
        });
      },
    },
    {
      eventName: 'HEART_BEAT',
      publish: (message) => {
        const data = message.data as [number, string, number | null, number];
        targets.heartBeat$.next({
          timestamp: data[0],
          id: data[1],
          diffDown: data[2],
          secdCounter: data[3],
          sendFrom: message.sendFrom,
        });
      },
    },
    {
      eventName: 'LOCAL_OBJECT_UPDATED',
      publish: () => {
        targets.localObjectUpdated$.next();
      },
    },
    {
      eventName: 'SYNCHRONIZE_AUDIO_LIST',
      publish: (message) => {
        targets.audioSyncList$.next({ isSendFromSelf: message.isSendFromSelf });
      },
    },
    {
      eventName: 'NETWORK_ERROR',
      publish: (message) => {
        const data = message.data as { errorType: string; errorMessage: string };
        targets.networkError$.next({ errorType: data.errorType, errorMessage: data.errorMessage });
      },
    },
  ];
}

export function subscribeNetworkBindings(
  source$: Observable<NetworkMessage> = networkMessage$,
  bindings: ReadonlyArray<ObjectChangeNetworkBinding>
): Subscription[] {
  return bindings.map((binding) =>
    source$
      .pipe(filter((message) => message.eventName === binding.eventName))
      .subscribe((message) => binding.publish(message))
  );
}

export function completeSubjects(subjects: ReadonlyArray<CompletableSubject>): void {
  subjects.forEach((subject) => subject.complete());
}
