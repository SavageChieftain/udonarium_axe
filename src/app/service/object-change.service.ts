import { DestroyRef, inject, Injectable } from '@angular/core';
import { childrenChanged$, objectChanged$ } from '@axe/class/core/synchronize-object/object-event-extension';
import { EventSystem } from '@axe/class/core/system';
import { Subject } from 'rxjs';

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

@Injectable({
  providedIn: 'root',
})
export class ObjectChangeService {
  private readonly destroyRef = inject(DestroyRef);

  /** Batched object change notifications (from both local and network sources) */
  readonly objectChanged$ = objectChanged$.asObservable();
  /** Batched children hierarchy change notifications */
  readonly childrenChanged$ = childrenChanged$.asObservable();

  // --- Events bridged from EventSystem ---
  private readonly _objectDeleted$ = new Subject<ObjectDeleteEvent>();
  private readonly _fileSyncList$ = new Subject<FileSyncEvent>();
  private readonly _fileResourceUpdated$ = new Subject<FileSyncEvent>();
  private readonly _peerConnect$ = new Subject<NetworkPeerEvent>();
  private readonly _peerDisconnect$ = new Subject<NetworkPeerEvent>();
  private readonly _networkOpen$ = new Subject<NetworkPeerEvent>();

  readonly objectDeleted$ = this._objectDeleted$.asObservable();
  readonly fileSyncList$ = this._fileSyncList$.asObservable();
  readonly fileResourceUpdated$ = this._fileResourceUpdated$.asObservable();
  readonly peerConnect$ = this._peerConnect$.asObservable();
  readonly peerDisconnect$ = this._peerDisconnect$.asObservable();
  readonly networkOpen$ = this._networkOpen$.asObservable();

  constructor() {
    EventSystem.register(this)
      .on('DELETE_GAME_OBJECT', (event) => {
        this._objectDeleted$.next({
          identifier: event.data.identifier,
          aliasName: event.data.aliasName,
          isSendFromSelf: event.isSendFromSelf,
        });
      })
      .on('SYNCHRONIZE_FILE_LIST', (event) => {
        this._fileSyncList$.next({ isSendFromSelf: event.isSendFromSelf });
      })
      .on('UPDATE_FILE_RESOURE', (event) => {
        this._fileResourceUpdated$.next({ isSendFromSelf: event.isSendFromSelf });
      })
      .on('CONNECT_PEER', (event) => {
        this._peerConnect$.next({ peerId: event.data.peerId });
      })
      .on('DISCONNECT_PEER', (event) => {
        this._peerDisconnect$.next({ peerId: event.data.peerId });
      })
      .on('OPEN_NETWORK', (event) => {
        this._networkOpen$.next({ peerId: event.data.peerId });
      });

    this.destroyRef.onDestroy(() => {
      EventSystem.unregister(this);
      this._objectDeleted$.complete();
      this._fileSyncList$.complete();
      this._fileResourceUpdated$.complete();
      this._peerConnect$.complete();
      this._peerDisconnect$.complete();
      this._networkOpen$.complete();
    });
  }
}
