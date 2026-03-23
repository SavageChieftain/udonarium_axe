import { Logger } from '@axe/class/core/logger';
import { setZeroTimeout } from '@axe/class/core/system/util/zero-timeout';

import { Connection, ConnectionCallback } from './connection';
import { IPeerContext, PeerContext } from './peer-context';
import { IRoomInfo } from './room-info';

type QueueItem = { data: unknown; sendTo: string | undefined };
type ConnectionClass = new (...args: never[]) => Connection;

const unknownPeer = PeerContext.parse('???');

export class Network {
  private static _instance: Network;
  static get instance(): Network {
    if (!Network._instance) Network._instance = new Network();
    return Network._instance;
  }
  get isOpen(): boolean {
    return this.connection ? this.connection.peer.isOpen : false;
  }

  get peerId(): string {
    return this.connection ? this.connection.peerId : unknownPeer.peerId;
  }
  get peerIds(): string[] {
    return this.connection ? this.connection.peerIds.concat() : [];
  }

  get peer(): IPeerContext {
    return this.connection ? this.connection.peer : unknownPeer;
  }
  get peers(): IPeerContext[] {
    return this.connection ? this.connection.peers.concat() : [];
  }

  // 後方互換エイリアス（フォーク独自コードとの互換性維持）
  get peerContext(): IPeerContext {
    return this.peer;
  }
  get peerContexts(): IPeerContext[] {
    return this.peers;
  }

  readonly callback: ConnectionCallback = new ConnectionCallback();
  get bandwidthUsage(): number {
    return this.connection ? this.connection.bandwidthUsage : 0;
  }

  private config: Record<string, unknown> = {};
  private connectionClassPromise!: Promise<ConnectionClass>;
  private connectionClass!: ConnectionClass;
  private connection!: Connection;

  private queue: Set<QueueItem> = new Set();
  private sendInterval: number = null!;
  private sendCallback = () => {
    this.sendQueue();
  };

  private callbackUnload: () => void = () => {
    this.close();
  };

  private constructor() {}

  configure(config: Record<string, unknown>) {
    this.config = config;
  }

  open(userId?: string): void;
  open(userId: string, roomId: string, roomName: string, password: string): void;
  open(...args: string[]): void {
    if (this.connectionClassPromise != null) {
      Logger.warn('[Network] 既に接続済みです');
      this.close();
    }

    this.openAsync(...args);
  }

  private async openAsync(...args: string[]) {
    const promise = this.dynamicImport();
    this.connectionClassPromise = promise;
    this.connectionClass = await promise;
    if (this.connectionClassPromise != promise) {
      // Promiseがresolveするまでに違うPromiseオブジェクトに置き換わっているならclose()済み
      return;
    }

    Logger.debug('[Network] open', ...args);
    this.connection = this.initializeConnection();
    this.connection.open(...args);

    window.addEventListener('unload', this.callbackUnload, false);
  }

  private close() {
    if (this.connection) this.connection.close();
    this.connection = null!;
    this.connectionClassPromise = null!;
    window.removeEventListener('unload', this.callbackUnload, false);
    Logger.debug('[Network] close');
  }

  async connect(peer: IPeerContext): Promise<boolean> {
    if (this.connection) return this.connection.connect(peer);
    return false;
  }

  disconnect(peer: IPeerContext) {
    if (!this.connection) return;
    if (this.connection.disconnect(peer)) {
      Logger.debug('[Network] disconnect', peer.peerId);
      this.disconnect(peer);
    }
  }

  send(data: unknown, sendTo?: string) {
    this.queue.add({ data: data, sendTo: sendTo });
    if (this.sendInterval === null) {
      this.sendInterval = setZeroTimeout(this.sendCallback);
    }
  }

  private sendQueue() {
    const broadcast: unknown[] = [];
    const unicast: { [sendTo: string]: unknown[] } = {};
    const echocast: unknown[] = [];

    let loopCount = this.queue.size < 128 ? this.queue.size : 128;
    for (const item of this.queue) {
      if (loopCount <= 0) break;
      loopCount--;
      this.queue.delete(item);
      if (item.sendTo == null) {
        broadcast.push(item.data);
      } else if (item.sendTo === this.peerId) {
        echocast.push(item.data);
      } else {
        if (!(item.sendTo in unicast)) unicast[item.sendTo] = [];
        unicast[item.sendTo].push(item.data);
      }
    }

    // できるだけ一纏めにして送る
    if (this.connection) {
      if (broadcast.length) this.connection.send(broadcast);
      for (const sendTo in unicast) this.connection.send(unicast[sendTo], sendTo);
    }

    // 自分自身への送信
    if (this.callback.onData) {
      this.callback.onData(null!, broadcast);
      this.callback.onData(this.peer, echocast);
    }

    if (0 < this.queue.size) {
      this.sendInterval = setZeroTimeout(this.sendCallback);
    } else {
      this.sendInterval = null!;
    }
  }

  listAllPeers(): Promise<string[]> {
    return this.connection ? this.connection.listAllPeers() : Promise.resolve([]);
  }

  listAllRooms(): Promise<IRoomInfo[]> {
    return this.connection ? this.connection.listAllRooms() : Promise.resolve([]);
  }

  private initializeConnection(): Connection {
    const connection = new this.connectionClass();
    connection.configure(this.config);

    connection.callback.onOpen = (peer) => {
      if (this.callback.onOpen) this.callback.onOpen(peer);
    };
    connection.callback.onClose = (peer) => {
      if (this.callback.onClose) this.callback.onClose(peer);
    };
    connection.callback.onConnect = (peer) => {
      if (this.callback.onConnect) this.callback.onConnect(peer);
    };
    connection.callback.onDisconnect = (peer) => {
      if (this.callback.onDisconnect) this.callback.onDisconnect(peer);
    };
    connection.callback.onData = (peer, data) => {
      if (this.callback.onData) this.callback.onData(peer, data);
    };
    connection.callback.onError = (peer, errorType, errorMessage, errorObject) => {
      if (this.callback.onError) this.callback.onError(peer, errorType, errorMessage, errorObject);
    };

    if (0 < this.queue.size && this.sendInterval === null) this.sendInterval = setZeroTimeout(this.sendCallback);

    return connection;
  }

  private async dynamicImport(_mode: string = ''): Promise<ConnectionClass> {
    return (await import('./skyway/skyway-connection')).SkyWayConnection;
  }
}
