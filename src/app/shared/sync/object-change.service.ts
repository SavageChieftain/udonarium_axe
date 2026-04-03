import { DestroyRef, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { networkMessage$ } from '@axe/core/network/network-messaging';
import { childrenChanged$, objectAdded$, objectChanged$, objectRemoved$ } from '@axe/core/sync/object-event-extension';
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
import { debounceTime, merge, Subject, Subscription } from 'rxjs';

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
export type {
  CursorMoveEvent,
  FileSyncEvent,
  HeartBeatEvent,
  IdentifierEvent,
  NetworkErrorEvent,
  NetworkPeerEvent,
  ObjectDeleteEvent,
  WritingMessageEvent,
} from '@axe/shared/sync/object-change-network-helpers';

@Injectable({
  providedIn: 'root',
})
export class ObjectChangeService {
  private readonly destroyRef = inject(DestroyRef);

  /** Batched object change notifications (from both local and network sources) */
  readonly objectChanged$ = objectChanged$.asObservable();
  /** Batched children hierarchy change notifications */
  readonly childrenChanged$ = childrenChanged$.asObservable();
  /** Emitted synchronously when an object is added to ObjectStore. */
  readonly objectAdded$ = objectAdded$.asObservable();

  // --- Per-identifier version signals ---
  private readonly _versions = new Map<string, WritableSignal<number>>();

  /** 特定オブジェクトの変更 signal（読み取り専用）。
   *  自身のプロパティ変更 + 子孫ノードの変更 の両方で increment される。 */
  versionOf(identifier: string): Signal<number> {
    let sig = this._versions.get(identifier);
    if (!sig) {
      sig = signal(0);
      this._versions.set(identifier, sig);
    }
    return sig.asReadonly();
  }

  /** 非 @SyncVar プロパティの変更時に versionOf signal を手動で increment する。 */
  notifyChanged(identifier: string): void {
    this._versions.get(identifier)?.update((v) => v + 1);
  }

  // --- Per-aliasName collection signals ---
  private readonly _collections = new Map<string, WritableSignal<number>>();

  /** 特定型のオブジェクトが追加/削除されたことを通知する signal（読み取り専用）。 */
  collectionOf(aliasName: string): Signal<number> {
    let sig = this._collections.get(aliasName);
    if (!sig) {
      sig = signal(0);
      this._collections.set(aliasName, sig);
    }
    return sig.asReadonly();
  }

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
    merge(
      this._fileSyncList$,
      this._fileResourceUpdated$,
      this.fileLoaded$,
      this._audioSyncList$,
      this.domainFileResourceUpdated$
    ).pipe(debounceTime(100)),
    { initialValue: undefined }
  );

  /** Signal that updates when network peer events occur (debounced). Read in getters to track peer changes. */
  readonly networkVersion = toSignal(
    merge(this._networkOpen$, this._peerConnect$, this._peerDisconnect$).pipe(debounceTime(100)),
    { initialValue: undefined }
  );

  constructor() {
    const sub = new Subscription();

    // --- Per-identifier version signal: increment on objectChanged$ ---
    sub.add(
      objectChanged$.subscribe((e) => {
        this._versions.get(e.identifier)?.update((v) => v + 1);
      })
    );

    // --- Per-identifier version signal: increment on childrenChanged$ (ancestor propagation) ---
    sub.add(
      childrenChanged$.subscribe((e) => {
        this._versions.get(e.identifier)?.update((v) => v + 1);
      })
    );

    // --- Per-aliasName collection signal: increment on objectAdded$ ---
    sub.add(
      objectAdded$.subscribe((e) => {
        this._collections.get(e.aliasName)?.update((v) => v + 1);
      })
    );

    // --- Per-aliasName collection signal: increment + version cleanup on objectRemoved$ ---
    sub.add(
      objectRemoved$.subscribe((e) => {
        this._collections.get(e.aliasName)?.update((v) => v + 1);
        this._versions.delete(e.identifier);
      })
    );

    subscribeNetworkBindings(
      networkMessage$,
      createObjectChangeNetworkBindings({
        objectDeleted$: this._objectDeleted$,
        fileSyncList$: this._fileSyncList$,
        fileResourceUpdated$: this._fileResourceUpdated$,
        peerConnect$: this._peerConnect$,
        peerDisconnect$: this._peerDisconnect$,
        networkOpen$: this._networkOpen$,
        writingMessage$: this._writingMessage$,
        shuffleCardStack$: this._shuffleCardStack$,
        rollDiceSymbol$: this._rollDiceSymbol$,
        cursorMove$: this._cursorMove$,
        heartBeat$: this._heartBeat$,
        localObjectUpdated$: this._localObjectUpdated$,
        audioSyncList$: this._audioSyncList$,
        networkError$: this._networkError$,
      })
    ).forEach((subscription) => sub.add(subscription));

    sub.add(
      networkMessage$.subscribe(() => {
        this._eventActivity$.next();
      })
    );

    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      completeSubjects([
        this._objectDeleted$,
        this._fileSyncList$,
        this._fileResourceUpdated$,
        this._peerConnect$,
        this._peerDisconnect$,
        this._networkOpen$,
        this._writingMessage$,
        this._shuffleCardStack$,
        this._rollDiceSymbol$,
        this._cursorMove$,
        this._heartBeat$,
        this._eventActivity$,
        this._localObjectUpdated$,
        this._audioSyncList$,
        this._networkError$,
      ]);
    });
  }
}
