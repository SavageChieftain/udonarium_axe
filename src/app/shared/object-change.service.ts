import { DestroyRef, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { networkMessage$ } from '@axe/core/network/network-messaging';
import { childrenChanged$, objectChanged$ } from '@axe/core/sync/object-event-extension';
import {
  alarmPop$,
  alarmTimeUp$,
  cardStackDecreased$,
  endOldVote$,
  fileLoaded$,
  fileResourceUpdated$ as domainFileResourceUpdated$,
  finishVote$,
  loadConfig$,
  messageAdded$,
  selectFile$,
  startCutIn$,
  startVote$,
  stopCutIn$,
  stopCutInByBgm$,
  xmlLoaded$,
} from '@axe/domain/domain-events';
import { debounceTime, merge, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export type {
  AlarmPopEvent,
  AlarmTimeUpEvent,
  CardStackDecreasedEvent,
  CutInEvent,
  FileSelectedEvent,
  FinishVoteEvent,
  LoadConfigEvent,
  MessageAddedEvent,
  XmlLoadedEvent,
} from '@axe/domain/domain-events';

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

@Injectable({
  providedIn: 'root',
})
export class ObjectChangeService {
  private readonly destroyRef = inject(DestroyRef);

  /** Batched object change notifications (from both local and network sources) */
  readonly objectChanged$ = objectChanged$.asObservable();
  /** Batched children hierarchy change notifications */
  readonly childrenChanged$ = childrenChanged$.asObservable();

  // --- Events bridged from networkMessage$ (network/P2P events only) ---
  private readonly _objectDeleted$ = new Subject<ObjectDeleteEvent>();
  private readonly _fileSyncList$ = new Subject<FileSyncEvent>();
  private readonly _fileResourceUpdated$ = new Subject<FileSyncEvent>();
  private readonly _peerConnect$ = new Subject<NetworkPeerEvent>();
  private readonly _peerDisconnect$ = new Subject<NetworkPeerEvent>();
  private readonly _networkOpen$ = new Subject<NetworkPeerEvent>();
  private readonly _writingMessage$ = new Subject<WritingMessageEvent>();
  private readonly _shuffleCardStack$ = new Subject<IdentifierEvent>();
  private readonly _rollDiceSymbol$ = new Subject<IdentifierEvent>();
  private readonly _cursorMove$ = new Subject<CursorMoveEvent>();
  private readonly _heartBeat$ = new Subject<HeartBeatEvent>();
  private readonly _eventActivity$ = new Subject<void>();
  private readonly _localObjectUpdated$ = new Subject<void>();
  private readonly _audioSyncList$ = new Subject<FileSyncEvent>();
  private readonly _networkError$ = new Subject<NetworkErrorEvent>();

  readonly objectDeleted$ = this._objectDeleted$.asObservable();
  readonly fileSyncList$ = this._fileSyncList$.asObservable();
  readonly fileResourceUpdated$ = this._fileResourceUpdated$.asObservable();
  readonly peerConnect$ = this._peerConnect$.asObservable();
  readonly peerDisconnect$ = this._peerDisconnect$.asObservable();
  readonly networkOpen$ = this._networkOpen$.asObservable();
  readonly writingMessage$ = this._writingMessage$.asObservable();
  readonly shuffleCardStack$ = this._shuffleCardStack$.asObservable();
  readonly rollDiceSymbol$ = this._rollDiceSymbol$.asObservable();
  readonly selectFile$ = selectFile$;
  readonly cursorMove$ = this._cursorMove$.asObservable();
  readonly heartBeat$ = this._heartBeat$.asObservable();
  /** Fires on every networkMessage$ event (wildcard). Used for network activity monitoring. */
  readonly eventActivity$ = this._eventActivity$.asObservable();
  readonly localObjectUpdated$ = this._localObjectUpdated$.asObservable();
  readonly audioSyncList$ = this._audioSyncList$.asObservable();
  readonly networkError$ = this._networkError$.asObservable();

  // --- Events re-exported from domain-events (local trigger-only, no network) ---
  readonly messageAdded$ = messageAdded$;
  readonly cardStackDecreased$ = cardStackDecreased$;
  readonly startCutIn$ = startCutIn$;
  readonly stopCutInByBgm$ = stopCutInByBgm$;
  readonly stopCutIn$ = stopCutIn$;
  readonly endOldVote$ = endOldVote$;
  readonly startVote$ = startVote$;
  readonly finishVote$ = finishVote$;
  readonly alarmTimeUp$ = alarmTimeUp$;
  readonly alarmPop$ = alarmPop$;
  readonly fileLoaded$ = fileLoaded$;
  readonly xmlLoaded$ = xmlLoaded$;
  readonly loadConfig$ = loadConfig$;
  readonly domainFileResourceUpdated$ = domainFileResourceUpdated$;

  /** Signal that updates when any file-related event occurs (debounced). Read in getters to track file changes. */
  readonly fileVersion = toSignal(
    merge(this._fileSyncList$, this._fileResourceUpdated$, this.fileLoaded$, this.domainFileResourceUpdated$).pipe(
      debounceTime(100)
    ),
    { initialValue: undefined }
  );

  /** Signal that updates when network peer events occur (debounced). Read in getters to track peer changes. */
  readonly networkVersion = toSignal(
    merge(this._networkOpen$, this._peerConnect$, this._peerDisconnect$).pipe(debounceTime(100)),
    { initialValue: undefined }
  );

  constructor() {
    const sub = new Subscription();

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'DELETE_GAME_OBJECT')).subscribe((msg) => {
        const data = msg.data as { identifier: string; aliasName: string };
        this._objectDeleted$.next({
          identifier: data.identifier,
          aliasName: data.aliasName,
          isSendFromSelf: msg.isSendFromSelf,
        });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'SYNCHRONIZE_FILE_LIST')).subscribe((msg) => {
        this._fileSyncList$.next({ isSendFromSelf: msg.isSendFromSelf });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'UPDATE_FILE_RESOURE')).subscribe((msg) => {
        this._fileResourceUpdated$.next({ isSendFromSelf: msg.isSendFromSelf });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'CONNECT_PEER')).subscribe((msg) => {
        this._peerConnect$.next({ peerId: (msg.data as { peerId: string }).peerId });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'DISCONNECT_PEER')).subscribe((msg) => {
        this._peerDisconnect$.next({ peerId: (msg.data as { peerId: string }).peerId });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'OPEN_NETWORK')).subscribe((msg) => {
        this._networkOpen$.next({ peerId: (msg.data as { peerId: string }).peerId });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'WRITING_A_MESSAGE')).subscribe((msg) => {
        this._writingMessage$.next({
          tabIdentifier: msg.data as string,
          sendFrom: msg.sendFrom,
          isSendFromSelf: msg.isSendFromSelf,
        });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'SHUFFLE_CARD_STACK')).subscribe((msg) => {
        this._shuffleCardStack$.next({ identifier: (msg.data as { identifier: string }).identifier });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'ROLL_DICE_SYMBOL')).subscribe((msg) => {
        this._rollDiceSymbol$.next({ identifier: (msg.data as { identifier: string }).identifier });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'CURSOR_MOVE')).subscribe((msg) => {
        const data = msg.data as [number, number, number];
        this._cursorMove$.next({
          x: data[0],
          y: data[1],
          z: data[2],
          sendFrom: msg.sendFrom,
        });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'HEART_BEAT')).subscribe((msg) => {
        const data = msg.data as [number, string, number | null, number];
        this._heartBeat$.next({
          timestamp: data[0],
          id: data[1],
          diffDown: data[2],
          secdCounter: data[3],
          sendFrom: msg.sendFrom,
        });
      })
    );

    sub.add(
      networkMessage$.subscribe(() => {
        this._eventActivity$.next();
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'LOCAL_OBJECT_UPDATED')).subscribe(() => {
        this._localObjectUpdated$.next();
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'SYNCHRONIZE_AUDIO_LIST')).subscribe((msg) => {
        this._audioSyncList$.next({ isSendFromSelf: msg.isSendFromSelf });
      })
    );

    sub.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === 'NETWORK_ERROR')).subscribe((msg) => {
        const data = msg.data as { errorType: string; errorMessage: string };
        this._networkError$.next({ errorType: data.errorType, errorMessage: data.errorMessage });
      })
    );

    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      this._objectDeleted$.complete();
      this._fileSyncList$.complete();
      this._fileResourceUpdated$.complete();
      this._peerConnect$.complete();
      this._peerDisconnect$.complete();
      this._networkOpen$.complete();
      this._writingMessage$.complete();
      this._shuffleCardStack$.complete();
      this._rollDiceSymbol$.complete();
      this._cursorMove$.complete();
      this._heartBeat$.complete();
      this._eventActivity$.complete();
      this._localObjectUpdated$.complete();
      this._audioSyncList$.complete();
      this._networkError$.complete();
    });
  }
}
