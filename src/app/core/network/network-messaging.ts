import { ApplicationRef } from '@angular/core';
import { Logger } from '@axe/core/logging/logger';
import { ServiceLocator } from '@axe/core/di/service-locator';
import { Observable, Subject } from 'rxjs';

import { Network } from './network';

// --- Wire protocol (kept compatible with existing peers) ---
export interface EventContext<T = unknown> {
  sendFrom: string;
  eventName: string;
  data: T;
}

// --- Message delivered to handlers ---
export interface NetworkMessage<T = unknown> {
  eventName: string;
  data: T;
  sendFrom: string;
  isSendFromSelf: boolean;
}

// --- Internal state ---
const _message$ = new Subject<NetworkMessage>();

/** Observable stream of ALL dispatched messages (network-received + locally dispatched). */
export const networkMessage$: Observable<NetworkMessage> = _message$.asObservable();

// --- Send to peers via Network ---
export function networkSend(eventName: string, data: unknown, sendTo?: string): void {
  const context: EventContext = {
    eventName,
    data,
    sendFrom: Network.peerId,
  };
  Network.instance.send(context, sendTo);
}

// --- Local dispatch (fires handlers synchronously, no network send) ---
export function localDispatch(eventName: string, data: unknown, sendFrom?: string): void {
  const from = sendFrom ?? Network.peerId;
  _message$.next({
    eventName,
    data,
    sendFrom: from,
    isSendFromSelf: from === Network.peerId,
  });
  scheduleAngularTick();
}

// --- Angular change detection bridge for zoneless mode ---
let _tickScheduled = false;

function scheduleAngularTick(): void {
  if (_tickScheduled) return;
  _tickScheduled = true;
  requestAnimationFrame(() => {
    _tickScheduled = false;
    try {
      const appRef = ServiceLocator.get(ApplicationRef);
      appRef.tick();
    } catch {
      /* ignore */
    }
  });
}

// --- Initialize: wire Network callbacks to message stream ---
let _initialized = false;

export function initializeNetworkMessaging(): void {
  if (_initialized) return;
  _initialized = true;

  const callback = Network.instance.callback;

  callback.onOpen = (peer) => {
    localDispatch('OPEN_NETWORK', { peerId: peer.peerId });
  };

  callback.onClose = (peer) => {
    localDispatch('CLOSE_NETWORK', { peerId: peer.peerId });
  };

  callback.onConnect = (peer) => {
    Logger.debug('[NetworkMessaging]', `<${peer.peerId}> connect <DataConnection>`);
    localDispatch('CONNECT_PEER', { peerId: peer.peerId });
  };

  callback.onDisconnect = (peer) => {
    Logger.debug('[NetworkMessaging]', `<${peer.peerId}> disconnect <DataConnection>`);
    localDispatch('DISCONNECT_PEER', { peerId: peer.peerId });
  };

  callback.onData = (_peer, data) => {
    for (const ctx of data as EventContext[]) {
      _message$.next({
        eventName: ctx.eventName,
        data: ctx.data,
        sendFrom: ctx.sendFrom,
        isSendFromSelf: ctx.sendFrom === Network.peerId,
      });
    }
    scheduleAngularTick();
  };

  callback.onError = (peer, errorType, errorMessage, errorObject) => {
    Logger.debug('[NetworkMessaging]', `<${peer.peerId}> ${errorMessage}`);
    localDispatch('NETWORK_ERROR', {
      peerId: peer.peerId,
      errorType,
      errorMessage,
      errorObject,
    });
  };
}
