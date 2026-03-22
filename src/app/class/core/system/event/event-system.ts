import { Logger } from '@axe/core/logger';
import { Network } from '@axe/core/system/network/network';

import { Event, EventContext } from './event';
import { Listener } from './listener';
import { Callback, EventMap } from './observer';
import { Subject } from './subject';

type EventName = string;

export class EventSystem implements Subject {
  private static _instance: EventSystem;
  static get instance(): EventSystem {
    if (!EventSystem._instance) {
      EventSystem._instance = new EventSystem();
      EventSystem._instance.initializeNetworkEvent();
    }
    return EventSystem._instance;
  }

  private listenerMap: Map<EventName, Listener[]> = new Map();
  private constructor() {}

  register(key: object): Listener {
    const listener: Listener = new Listener(this, key);
    return listener;
  }

  unregister(key: object): void;
  unregister(key: object, eventName: string): void;
  unregister(key: object, callback: Callback<unknown>): void;
  unregister(key: object, eventName: string, callback: Callback<unknown>): void;
  unregister(...args: unknown[]): void {
    if (args.length === 1) {
      this._unregister(args[0] as object, null, null!);
    } else if (args.length === 2) {
      if (typeof args[1] === 'string') {
        this._unregister(args[0] as object, args[1], null!);
      } else {
        this._unregister(args[0] as object, null, args[1] as Callback<unknown>);
      }
    } else {
      this._unregister(args[0] as object, args[1] as string, args[2] as Callback<unknown>);
    }
  }

  private _unregister(key: object = this, eventName: string | null, callback: Callback<unknown>) {
    const listenersIterator = this.listenerMap.values();
    for (const listeners of listenersIterator) {
      for (const listener of listeners.concat()) {
        if (listener.isEqual(key, eventName ?? '', callback)) {
          listener.unregister();
        }
      }
    }
  }

  registerListener(listener: Listener): Listener {
    const listeners: Listener[] = this.getListeners(listener.eventName);

    listeners.push(listener);
    listeners.sort((a, b) => b.priority - a.priority);
    this.listenerMap.set(listener.eventName, listeners);
    return listener;
  }

  unregisterListener(listener: Listener): Listener {
    const listeners = this.getListeners(listener.eventName);
    const index = listeners.indexOf(listener);
    if (index < 0) return null!;
    listeners.splice(index, 1);
    listener.unregister();
    if (listeners.length < 1) this.listenerMap.delete(listener.eventName);
    return listener;
  }

  call<K extends keyof EventMap>(eventName: K, data: EventMap[K], sendTo?: string): void;
  call<T, S extends string>(eventName: Exclude<S, keyof EventMap>, data: T, sendTo?: string): void;
  call<T>(event: Event<T>, sendTo?: string): void;
  call<_T>(...args: unknown[]): void {
    if (typeof args[0] === 'string') {
      this._call(new Event(args[0], args[1]), args[2] as string | undefined);
    } else {
      this._call(args[0] as Event<unknown>, args[1] as string | undefined);
    }
  }

  private _call(event: Event<unknown>, sendTo?: string) {
    const context = event.toContext();
    Network.instance.send(context, sendTo);
  }

  trigger<K extends keyof EventMap>(eventName: K, data: EventMap[K]): Event<EventMap[K]>;
  trigger<T, S extends string>(eventName: Exclude<S, keyof EventMap>, data: T): Event<T>;
  trigger<T>(event: Event<T>): Event<T>;
  trigger<T>(event: EventContext<T>): Event<T>;
  trigger<T>(...args: unknown[]): Event<T> {
    if (args.length === 2) {
      return this._trigger(new Event(args[0] as string, args[1] as T));
    } else if (args[0] instanceof Event) {
      return this._trigger(args[0] as Event<T>);
    } else {
      const ctx = args[0] as EventContext<T>;
      return this._trigger(new Event(ctx.eventName, ctx.data, ctx.sendFrom));
    }
  }

  private _trigger<T>(event: Event<T>): Event<T> {
    const listeners = this.getListeners(event.eventName).concat(this.getListeners('*'));
    for (const listener of listeners) {
      listener.trigger(event);
    }
    return event;
  }

  private getListeners(eventName: string): Listener[] {
    return this.listenerMap.has(eventName) ? this.listenerMap.get(eventName)! : [];
  }

  private initializeNetworkEvent() {
    const callback = Network.instance.callback;

    callback.onOpen = (peer) => {
      this.trigger('OPEN_NETWORK', { peerId: peer.peerId });
    };
    callback.onClose = (peer) => {
      this.trigger('CLOSE_NETWORK', { peerId: peer.peerId });
    };

    callback.onConnect = (peer) => {
      this.sendSystemMessage('<' + peer.peerId + '> connect <DataConnection>');
      this.trigger('CONNECT_PEER', { peerId: peer.peerId });
    };

    callback.onDisconnect = (peer) => {
      this.sendSystemMessage('<' + peer.peerId + '> disconnect <DataConnection>');
      this.trigger('DISCONNECT_PEER', { peerId: peer.peerId });
    };

    callback.onData = (peer, data) => {
      for (const event of data as EventContext<never>[]) {
        this.trigger(event);
      }
    };

    callback.onError = (peer, errorType, errorMessage, errorObject) => {
      this.sendSystemMessage('<' + peer.peerId + '> ' + errorMessage);
      this.trigger('NETWORK_ERROR', {
        peerId: peer.peerId,
        errorType: errorType,
        errorMessage: errorMessage,
        errorObject: errorObject,
      });
    };
  }

  private sendSystemMessage(message: string) {
    Logger.debug('[EventSystem]', message);
  }
}
