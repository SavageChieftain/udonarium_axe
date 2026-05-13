import { DestroyRef, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import {
  type CursorMoveEvent,
  type FileSyncEvent,
  type HeartBeatEvent,
  type IdentifierEvent,
  type NetworkErrorEvent,
  type NetworkPeerEvent,
  type ObjectDeleteEvent,
  subscribeNetworkBindings,
  type WritingMessageEvent,
} from '@axe/application/sync/object-change-network-helpers';
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
  soundOnlyCutIn$,
  startCutIn$,
  startVote$,
  stopCutIn$,
  stopCutInByBgm$,
  xmlLoaded$,
} from '@axe/core/event/domain-events';
import { EventChannel, ReadableChannel } from '@axe/core/event/event-channel';
import { networkMessage$ } from '@axe/core/network/network-messaging';
import {
  childrenChanged$,
  type ChildrenChangeEvent,
  objectAdded$,
  objectChanged$,
  type ObjectChangeEvent,
  objectRemoved$,
  type ObjectStoreEvent,
} from '@axe/core/sync/object-event-extension';

export type {
  CursorMoveEvent,
  FileSyncEvent,
  HeartBeatEvent,
  IdentifierEvent,
  NetworkErrorEvent,
  NetworkPeerEvent,
  ObjectDeleteEvent,
  WritingMessageEvent,
} from '@axe/application/sync/object-change-network-helpers';
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
} from '@axe/core/event/domain-events';

@Injectable({
  providedIn: 'root',
})
export class ObjectChangeService {
  private readonly destroyRef = inject(DestroyRef);

  /** Batched object change notifications (from both local and network sources) */
  readonly objectChanged$: ReadableChannel<ObjectChangeEvent> = objectChanged$;
  /** Batched children hierarchy change notifications */
  readonly childrenChanged$: ReadableChannel<ChildrenChangeEvent> = childrenChanged$;
  /** Emitted synchronously when an object is added to ObjectStore. */
  readonly objectAdded$: ReadableChannel<ObjectStoreEvent> = objectAdded$;
  /** Emitted synchronously when an object is removed from ObjectStore. */
  readonly objectRemoved$: ReadableChannel<ObjectStoreEvent> = objectRemoved$;

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

  /** 特定型のオブジェクトが追加/削除されたことを通知する signal（読み取り専用）。
   *  objectAdded$/objectRemoved$ で自動 increment される。
   *  フィルタ済みコレクションの見かけ上の変化（location/parent 変更等）には
   *  notifyCollectionChanged() で手動 increment が必要。 */
  collectionOf(aliasName: string): Signal<number> {
    let sig = this._collections.get(aliasName);
    if (!sig) {
      sig = signal(0);
      this._collections.set(aliasName, sig);
    }
    return sig.asReadonly();
  }

  /** フィルタ済みコレクションの見かけ上の変化（location/parent 変更等）を通知する。 */
  notifyCollectionChanged(aliasName: string): void {
    this._collections.get(aliasName)?.update((v) => v + 1);
  }

  /**
   * `objectChanged$` を identifier list でフィルタする helper。
   * `getIdentifiers` は subscribe 中の毎イベント時に評価され、最新の id セットに対する変更だけ
   * listener に届ける（component 自身の追従先 id 等、動的なケースに対応するためコールバック形式）。
   * 静的な単一 id だけ気にしたいなら `[id]` を返すだけで足りる。
   * @returns 購読解除関数。`destroyRef` 指定で自動的にクリーンアップされる。
   */
  onObjectChangedFor(
    getIdentifiers: () => readonly string[],
    listener: (event: ObjectChangeEvent) => void,
    destroyRef?: DestroyRef
  ): () => void {
    return this.objectChanged$.subscribe((event) => {
      const ids = getIdentifiers();
      if (ids.includes(event.identifier)) listener(event);
    }, destroyRef);
  }

  /**
   * `objectChanged$` を aliasName でフィルタする helper。
   * 部屋内の全 SyncObject 変更で発火するイベントを、特定の型のみに絞り込みたいユースケース用。
   */
  onObjectChangedForAlias(
    aliasNames: readonly string[],
    listener: (event: ObjectChangeEvent) => void,
    destroyRef?: DestroyRef
  ): () => void {
    return this.objectChanged$.subscribe((event) => {
      if (aliasNames.includes(event.aliasName)) listener(event);
    }, destroyRef);
  }

  // --- Events bridged from networkMessage$ (network/P2P events only) ---
  private readonly _objectDeleted$ = new EventChannel<ObjectDeleteEvent>();
  private readonly _fileSyncList$ = new EventChannel<FileSyncEvent>();
  private readonly _fileResourceUpdated$ = new EventChannel<FileSyncEvent>();
  private readonly _peerConnect$ = new EventChannel<NetworkPeerEvent>();
  private readonly _peerDisconnect$ = new EventChannel<NetworkPeerEvent>();
  private readonly _networkOpen$ = new EventChannel<NetworkPeerEvent>();
  private readonly _writingMessage$ = new EventChannel<WritingMessageEvent>();
  private readonly _shuffleCardStack$ = new EventChannel<IdentifierEvent>();
  private readonly _rollDiceSymbol$ = new EventChannel<IdentifierEvent>();
  private readonly _cursorMove$ = new EventChannel<CursorMoveEvent>();
  private readonly _heartBeat$ = new EventChannel<HeartBeatEvent>();
  private readonly _eventActivity$ = new EventChannel<void>();
  private readonly _localObjectUpdated$ = new EventChannel<void>();
  private readonly _audioSyncList$ = new EventChannel<FileSyncEvent>();
  private readonly _networkError$ = new EventChannel<NetworkErrorEvent>();

  readonly objectDeleted$: ReadableChannel<ObjectDeleteEvent> = this._objectDeleted$;
  readonly fileSyncList$: ReadableChannel<FileSyncEvent> = this._fileSyncList$;
  readonly fileResourceUpdated$: ReadableChannel<FileSyncEvent> = this._fileResourceUpdated$;
  readonly peerConnect$: ReadableChannel<NetworkPeerEvent> = this._peerConnect$;
  readonly peerDisconnect$: ReadableChannel<NetworkPeerEvent> = this._peerDisconnect$;
  readonly networkOpen$: ReadableChannel<NetworkPeerEvent> = this._networkOpen$;
  readonly writingMessage$: ReadableChannel<WritingMessageEvent> = this._writingMessage$;
  readonly shuffleCardStack$: ReadableChannel<IdentifierEvent> = this._shuffleCardStack$;
  readonly rollDiceSymbol$: ReadableChannel<IdentifierEvent> = this._rollDiceSymbol$;
  readonly selectFile$ = selectFile$;
  readonly cursorMove$: ReadableChannel<CursorMoveEvent> = this._cursorMove$;
  readonly heartBeat$: ReadableChannel<HeartBeatEvent> = this._heartBeat$;
  /** Fires on every networkMessage$ event (wildcard). Used for network activity monitoring. */
  readonly eventActivity$: ReadableChannel<void> = this._eventActivity$;
  readonly localObjectUpdated$: ReadableChannel<void> = this._localObjectUpdated$;
  readonly audioSyncList$: ReadableChannel<FileSyncEvent> = this._audioSyncList$;
  readonly networkError$: ReadableChannel<NetworkErrorEvent> = this._networkError$;

  // --- Events re-exported from domain-events (local trigger-only, no network) ---
  readonly messageAdded$ = messageAdded$;
  readonly cardStackDecreased$ = cardStackDecreased$;
  readonly startCutIn$ = startCutIn$;
  readonly soundOnlyCutIn$ = soundOnlyCutIn$;
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

  /** Signal that updates when any file-related event occurs (throttled 100ms, leading + trailing). */
  readonly fileVersion = signal<number>(0);

  /** Signal that updates when network peer events occur (debounced 100ms). */
  readonly networkVersion = signal<number>(0);

  constructor() {
    // --- Per-identifier version signal: increment on objectChanged$ ---
    objectChanged$.subscribe((e) => {
      this._versions.get(e.identifier)?.update((v) => v + 1);
    }, this.destroyRef);

    // --- Per-identifier version signal: increment on childrenChanged$ ---
    childrenChanged$.subscribe((e) => {
      this._versions.get(e.identifier)?.update((v) => v + 1);
    }, this.destroyRef);

    // --- Per-aliasName collection signal: increment on objectAdded$ ---
    objectAdded$.subscribe((e) => {
      this._collections.get(e.aliasName)?.update((v) => v + 1);
    }, this.destroyRef);

    // --- Per-aliasName collection signal: increment + version cleanup on objectRemoved$ ---
    objectRemoved$.subscribe((e) => {
      this._collections.get(e.aliasName)?.update((v) => v + 1);
      this._versions.delete(e.identifier);
    }, this.destroyRef);

    // --- Wire network messages to private EventChannels ---
    const offNetworkBindings = subscribeNetworkBindings(networkMessage$, {
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
      eventActivity$: this._eventActivity$,
    });
    this.destroyRef.onDestroy(offNetworkBindings);

    // --- Throttled fileVersion signal (leading + trailing, 100ms) ---
    let fileTimer: ReturnType<typeof setTimeout> | null = null;
    let filePending = false;
    const flushFileVersion = () => {
      fileTimer = null;
      if (filePending) {
        filePending = false;
        this.fileVersion.update((v) => v + 1);
        fileTimer = setTimeout(flushFileVersion, 100);
      }
    };
    const bumpFileVersion = () => {
      if (fileTimer === null) {
        this.fileVersion.update((v) => v + 1);
        fileTimer = setTimeout(flushFileVersion, 100);
      } else {
        filePending = true;
      }
    };
    this._fileSyncList$.subscribe(bumpFileVersion, this.destroyRef);
    this._fileResourceUpdated$.subscribe(bumpFileVersion, this.destroyRef);
    fileLoaded$.subscribe(bumpFileVersion, this.destroyRef);
    this._audioSyncList$.subscribe(bumpFileVersion, this.destroyRef);
    domainFileResourceUpdated$.subscribe(bumpFileVersion, this.destroyRef);
    this.destroyRef.onDestroy(() => {
      if (fileTimer !== null) clearTimeout(fileTimer);
    });

    // --- Debounced networkVersion signal ---
    let netTimer: ReturnType<typeof setTimeout> | null = null;
    const bumpNetworkVersion = () => {
      if (netTimer !== null) clearTimeout(netTimer);
      netTimer = setTimeout(() => {
        netTimer = null;
        this.networkVersion.update((v) => v + 1);
      }, 100);
    };
    this._networkOpen$.subscribe(bumpNetworkVersion, this.destroyRef);
    this._peerConnect$.subscribe(bumpNetworkVersion, this.destroyRef);
    this._peerDisconnect$.subscribe(bumpNetworkVersion, this.destroyRef);
    this.destroyRef.onDestroy(() => {
      if (netTimer !== null) clearTimeout(netTimer);
    });
  }
}
