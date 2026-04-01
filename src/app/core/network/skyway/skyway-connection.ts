import { Logger } from '@axe/core/logger';
import { Connection, ConnectionCallback } from '@axe/core/network/connection';
import { IPeerContext, PeerContext } from '@axe/core/network/peer-context';
import { IRoomInfo, RoomInfo } from '@axe/core/network/room-info';
import { diff } from '@axe/core/util/array-util';
import { compressAsync, decompressAsync } from '@axe/core/util/compress';
import * as MessagePack from '@axe/core/util/message-pack';
import { setZeroTimeout } from '@axe/core/util/zero-timeout';

import { SkyWayDataStream } from './skyway-data-stream';
import { SkyWayDataStreamList } from './skyway-data-stream-list';
import { SkyWayFacade } from './skyway-facade';

type PeerId = string;

interface DataContainer {
  data: Uint8Array;
  users?: string[];
  ttl: number;
  isCompressed?: boolean;
}

export class SkyWayConnection implements Connection {
  private get userIds(): string[] {
    return [...this.peers.map((peer) => peer.userId).filter((userId) => 0 < userId.length), this.peer.userId];
  }

  get peerId(): string {
    return this.peer.peerId;
  }
  get peerIds(): string[] {
    return this.streams.peerIds;
  }

  get peer(): PeerContext {
    return this.skyWay.peer;
  }
  get peers(): PeerContext[] {
    return this.streams.peers;
  }

  readonly callback: ConnectionCallback = new ConnectionCallback();
  bandwidthUsage: number = 0;

  private readonly skyWay: SkyWayFacade = new SkyWayFacade();
  private readonly streams: SkyWayDataStreamList = new SkyWayDataStreamList();

  private listAllPeersCache: PeerId[] = [];
  private httpRequestInterval: number = performance.now() + 500;
  private outboundQueue: Promise<void> = Promise.resolve();
  private inboundQueue: Promise<void> = Promise.resolve();

  private readonly trustedPeerIds: Set<PeerId> = new Set();
  private readonly relayingPeerIds: Map<string, string[]> = new Map();
  private readonly maybeUnavailablePeerIds: Set<string> = new Set();

  configure(config: Record<string, unknown>) {
    this.skyWay.url = ((config?.backend as Record<string, unknown>)?.url as string) ?? '';
  }

  openStandby(userId?: string): void {
    const peer$ = userId ? PeerContext.create(userId) : PeerContext.create(PeerContext.generateId());
    this.trustedPeerIds.clear();
    peer$.then((peer) => this.openSkyWay(peer));
  }

  open(userId: string, roomId: string, roomName: string, password: string): void {
    PeerContext.create(userId, roomId, roomName, password).then((peer) => {
      this.trustedPeerIds.clear();
      this.openSkyWay(peer);
    });
  }

  close() {
    this.disconnectAll();
    this.skyWay.close();
  }

  leaveImmediately() {
    this.skyWay.leaveImmediately();
  }

  async rejoinAfterLeave() {
    await this.skyWay.rejoinAfterLeave();
    for (const peerId of [...this.trustedPeerIds]) {
      const peer = PeerContext.parse(peerId);
      this.disconnect(peer);
      this.connect(peer);
    }
  }

  async connect(peer: IPeerContext): Promise<boolean> {
    if (!this.peer.isRoom) {
      Logger.warn('[SkyWay] ルーム接続のみ可能');
      const errorType = 'udonarium-unsupported';
      const errorMessage =
        '現在のユドナリウムでSkyWay(2023)を使用する場合、プライベート接続は利用できません。ルーム接続機能を利用してください。';
      if (this.callback.onError) this.callback.onError(this.peer, errorType, errorMessage, {});
      return false;
    }

    if (!(await this.shouldConnect(peer.peerId))) {
      return false;
    }

    this.connectStream(SkyWayDataStream.createSubscription(this.skyWay, peer));
    return true;
  }

  private async shouldConnect(peerId: string): Promise<boolean> {
    if (!this.skyWay.isOpen) {
      return false;
    }

    if (this.peerId === peerId) {
      return false;
    }

    if (this.peerIds.includes(peerId)) {
      return false;
    }

    if (!(await this.peer.verifyPeer(peerId))) {
      return false;
    }

    const roomMembers = this.skyWay?.room?.members?.map((m) => m.name) ?? [];
    if (!roomMembers.includes(peerId)) {
      return false;
    }

    if (peerId && peerId.length && peerId !== this.peerId) return true;
    return false;
  }

  disconnect(peer: IPeerContext): boolean {
    const stream = this.streams.find(peer.peerId);
    if (!stream) return false;
    this.disconnectStream(stream);
    return true;
  }

  disconnectAll() {
    for (const peer of this.peers) {
      this.disconnect(peer);
    }
  }

  send(data: unknown, sendTo?: string) {
    if (this.peers.length < 1) return;
    const container: DataContainer = {
      data: MessagePack.encode(data),
      ttl: 1,
    };

    const byteLength = container.data.byteLength;
    this.bandwidthUsage += byteLength;
    this.outboundQueue = this.outboundQueue.then(
      () =>
        new Promise<void>((resolve, _reject) => {
          setZeroTimeout(async () => {
            if (1 * 1024 < container.data.byteLength && Array.isArray(data) && 1 < data.length) {
              const compressed = await compressAsync(container.data);
              if (compressed.byteLength < container.data.byteLength) {
                container.data = compressed;
                container.isCompressed = true;
              }
            }
            if (sendTo) {
              this.sendUnicast(container, sendTo);
            } else {
              this.sendBroadcast(container);
            }
            this.bandwidthUsage -= byteLength;
            return resolve();
          });
        })
    );
  }

  private sendUnicast(container: DataContainer, sendTo: string) {
    container.ttl = 0;
    const stream = this.streams.find(sendTo);
    if (stream && stream.open) {
      stream.send(container);
    }
  }

  private sendBroadcast(container: DataContainer) {
    for (const stream of this.streams) {
      if (stream.open) stream.send(container);
    }
  }

  async listAllPeers(): Promise<string[]> {
    const now = performance.now();
    if (now >= this.httpRequestInterval) {
      this.listAllPeersCache = await this.skyWay.listAllPeers();
      this.httpRequestInterval = now + 10000;
    }

    return this.listAllPeersCache;
  }

  async listAllRooms(): Promise<IRoomInfo[]> {
    const allPeerIds = await this.listAllPeers();
    return RoomInfo.listFrom(allPeerIds);
  }

  private async openSkyWay(peer: IPeerContext) {
    if (this.skyWay.context) {
      Logger.warn('[SkyWay] 既に接続済みです');
      await this.skyWay.close();
    }

    this.skyWay.onOpen = (_peer) => {
      if (this.callback.onOpen) this.callback.onOpen(this.peer);
    };

    this.skyWay.onClose = (_peer) => {
      if (this.peer.isOpen) this.close();
      if (this.callback.onClose) this.callback.onClose(this.peer);
    };

    this.skyWay.onFatalError = (peer, errorType, errorMessage, errorObject) => {
      Logger.error('[SkyWay] 致命的エラー', errorObject);
      if (this.peer.isOpen) {
        this.close();
        if (this.callback.onClose) this.callback.onClose(this.peer);
      }
      if (this.callback.onError) this.callback.onError(this.peer, errorType, errorMessage, errorObject);
    };

    this.skyWay.onSubscribed = async (peer, _subscription) => {
      const stream = SkyWayDataStream.createPublication(this.skyWay, peer);

      if (!(await this.peer.verifyPeer(stream.peer.peerId))) {
        Logger.warn(`[SkyWay] 不正なピアからの接続を拒否: ${stream.peer.peerId}`);
        stream.reject();
        return;
      }
      this.connectStream(stream);
    };

    this.skyWay.onRoomRestore = (_peer) => {
      for (const peerId of this.trustedPeerIds) {
        const peer = PeerContext.parse(peerId);
        this.disconnect(peer);
        this.connect(peer);
      }
    };

    await this.skyWay.open(peer);
    return;
  }

  private connectStream(stream: SkyWayDataStream) {
    if (this.streams.add(stream) == null) return;

    this.trustedPeerIds.delete(stream.peer.peerId);
    this.maybeUnavailablePeerIds.add(stream.peer.peerId);

    stream.on('data', (data) => {
      this.onData(stream, data);
    });
    stream.on('open', () => {
      this.trustedPeerIds.add(stream.peer.peerId);
      this.maybeUnavailablePeerIds.delete(stream.peer.peerId);
      this.notifyUserList();
      if (this.callback.onConnect) this.callback.onConnect(stream.peer);
    });
    stream.on('close', () => {
      this.disconnectStream(stream);
    });
    stream.on('error', () => {
      this.disconnectStream(stream);
    });
    stream.on('stats', async () => {
      // not implemented
    });

    stream.connect();
  }

  private disconnectStream(stream: SkyWayDataStream) {
    stream.disconnect();
    const closed = this.streams.remove(stream);

    this.relayingPeerIds.delete(stream.peer.peerId);
    this.relayingPeerIds.forEach((peerIds) => {
      const index = peerIds.indexOf(stream.peer.peerId);
      if (0 <= index) peerIds.splice(index, 1);
    });
    this.notifyUserList();
    if (closed && this.callback.onDisconnect) this.callback.onDisconnect(closed.peer);
  }

  private onData(stream: SkyWayDataStream, container: DataContainer) {
    if (container.users && 0 < container.users.length) this.onUpdateUserIds(stream, container.users);
    if (0 < container.ttl) this.onRelay(stream, container);
    if (!this.callback.onData) return;
    const byteLength = container.data.byteLength;
    this.bandwidthUsage += byteLength;
    this.inboundQueue = this.inboundQueue.then(
      () =>
        new Promise<void>((resolve, _reject) => {
          setZeroTimeout(async () => {
            if (!this.callback.onData) return;
            const data = container.isCompressed ? await decompressAsync(container.data) : container.data;
            this.callback.onData(stream.peer, MessagePack.decode(data) as unknown[]);
            this.bandwidthUsage -= byteLength;
            return resolve();
          });
        })
    );
  }

  private onRelay(stream: SkyWayDataStream, container: DataContainer) {
    container.ttl--;

    const relayingPeerIds: string[] = this.relayingPeerIds.get(stream.peer.peerId) ?? [];
    if (relayingPeerIds == null) return;

    if (container.users && 0 < container.users.length) {
      container.users = this.userIds;
    }

    for (const peerId of relayingPeerIds) {
      const conn = this.streams.find(peerId);
      if (conn && conn.open) {
        conn.send(container);
      }
    }
  }

  private async onUpdateUserIds(stream: SkyWayDataStream, userIds: string[]) {
    let needsNotifyUserList = false;
    for (const userId of userIds) {
      const peer = await this.makeFriendPeer(userId);
      const stream = this.streams.find(peer.peerId);
      if (stream && stream.peer.userId !== userId) {
        stream.peer.userId = userId;
        needsNotifyUserList = true;
      }
    }

    const { diff1: relayingUserIds, diff2: unknownUserIds } = diff(this.userIds, userIds);
    this.relayingPeerIds.set(
      stream.peer.peerId,
      await Promise.all(relayingUserIds.map(async (userId) => (await this.makeFriendPeer(userId)).peerId))
    );

    if (unknownUserIds.length) {
      for (const userId of unknownUserIds) {
        const peer = await this.makeFriendPeer(userId);
        if (!this.maybeUnavailablePeerIds.has(peer.peerId)) {
          await this.connect(peer);
        }
      }
    }
    if (needsNotifyUserList) this.notifyUserList();
  }

  private notifyUserList() {
    this.streams.refresh();
    if (this.streams.length < 1) return;
    const container: DataContainer = {
      data: MessagePack.encode([]),
      users: this.userIds,
      ttl: 1,
    };
    this.sendBroadcast(container);
  }

  private async makeFriendPeer(userId: string): Promise<PeerContext> {
    return this.peer.isRoom
      ? PeerContext.create(userId, this.peer.roomId, this.peer.roomName, this.peer.password)
      : PeerContext.create(userId);
  }
}
