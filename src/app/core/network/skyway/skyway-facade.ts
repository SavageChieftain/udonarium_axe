import { Logger as AppLogger } from '@axe/core/logging/logger';
import { IPeerContext, PeerContext } from '@axe/core/network/peer-context';
import { sha256Base64Url } from '@axe/core/util/crypto-util';
import {
  Channel,
  LocalDataStream,
  LocalPerson,
  Logger,
  Publication,
  SkyWayChannel,
  SkyWayContext,
  SkyWayError,
  SkyWayStreamFactory,
  Subscription,
} from '@skyway-sdk/core';

import { SkyWayBackend } from './skyway-backend';

export class SkyWayFacade {
  url = '';
  context: SkyWayContext | null = null;
  private lobby: Channel | null = null;
  private lobbyPerson: LocalPerson | null = null;
  room: Channel | null = null;
  roomPerson: LocalPerson | null = null;

  publication: Publication<LocalDataStream> | null = null;

  peer: PeerContext = PeerContext.parse('???');
  get isOpen(): boolean {
    return this.peer.isOpen;
  }
  private isDestroyed = false;

  onOpen: ((peer: IPeerContext) => void) | null = null;
  onClose: ((peer: IPeerContext) => void) | null = null;
  onFatalError: ((peer: IPeerContext, errorType: string, errorMessage: string, errorObject: unknown) => void) | null =
    null;
  onSubscribed: ((peer: IPeerContext, subscription: Subscription) => void) | null = null;
  onRoomRestore: ((peer: IPeerContext) => void) | null = null;

  async open(peer: IPeerContext) {
    if (this.isOpen) await this.close();
    try {
      this.peer = PeerContext.parse(peer.peerId);
      this.peer.userId = peer.userId;
      this.peer.password = peer.password;
      this.isDestroyed = false;

      await this.createContext();
      await this.joinRoom();
      await this.joinLobby();

      this.peer.isOpen = true;

      if (this.onOpen) this.onOpen(this.peer);
    } catch (err) {
      AppLogger.error('[SkyWay] open失敗', err);
      if (this.onFatalError) this.onFatalError(this.peer, (err as Error).name, (err as Error).message, err as Error);
    }
  }

  async close() {
    try {
      this.peer = PeerContext.parse('???');
      this.isDestroyed = true;

      await this.leaveLobby();
      await this.leaveRoom();
      await this.disposeContext();
    } catch (err) {
      AppLogger.error('[SkyWay] close失敗', err);
    }
  }

  /**
   * ページアンロード時に使用する即時退室メソッド。
   * awaitせずにleave()を発火し、サーバに退室を通知する。
   * コンテキストは破棄しない（beforeunloadキャンセル時の再参加に備える）。
   */
  leaveImmediately() {
    try {
      if (this.roomPerson?.state !== 'left') {
        this.roomPerson?.leave().catch(() => {});
      }
      if (this.lobbyPerson?.state !== 'left') {
        this.lobbyPerson?.leave().catch(() => {});
      }
    } catch {
      // ページアンロード中のエラーは無視
    }
  }

  /**
   * beforeunloadダイアログがキャンセルされた後にルーム・ロビーへ再参加する。
   */
  async rejoinAfterLeave() {
    if (this.isDestroyed || !this.context || this.context.disposed) return;
    try {
      // left 状態の person をクリアして新規参加できるようにする
      if (this.roomPerson?.state === 'left') this.roomPerson = null;
      if (this.lobbyPerson?.state === 'left') this.lobbyPerson = null;
      if (this.publication) {
        this.publication.onSubscribed.removeAllListeners();
        this.publication = null;
      }
      await this.joinRoomPerson();
      await this.createRoomDataStream();
      await this.joinLobbyPerson();
      AppLogger.info('[SkyWay] beforeunloadキャンセル後の再参加完了');
    } catch (err) {
      AppLogger.error('[SkyWay] 再参加失敗', err);
    }
  }

  private async createContext() {
    await this.disposeContext();
    if (this.isDestroyed) return;

    const backend = new SkyWayBackend(this.url);
    const channelName = this.peer.isRoom
      ? await sha256Base64Url(`${this.peer.roomId}${this.peer.roomName}${this.peer.password}`)
      : this.peer.peerId;

    const authToken = await backend.createSkyWayAuthToken(channelName, this.peer.peerId);
    if (authToken.length < 1) {
      const message = `APIバックエンド< ${backend.url} >にアクセスできませんでした。SkyWayの認証トークンを発行するサーバが必要です。`;
      if (this.onFatalError) this.onFatalError(this.peer, 'server-error', message, new Error(message));
      return;
    }

    const context = await SkyWayContext.Create(authToken);
    context.onTokenUpdateReminder.add(async () => {
      AppLogger.debug('[SkyWay] トークン更新リマインダー');
      const authToken = await backend.createSkyWayAuthToken(channelName, this.peer.peerId);
      if (authToken.length < 1) {
        const message = `APIバックエンド< ${backend.url} >にアクセスできませんでした。`;
        if (this.onFatalError) this.onFatalError(this.peer, 'server-error', message, new Error(message));
        return;
      }
      context.updateAuthToken(authToken);
    });

    context.onTokenExpired.add(() => {
      AppLogger.error('[SkyWay] トークン有効期限切れ');
      if (this.isOpen) {
        this.close();
        if (this.onClose) this.onClose(this.peer);
      }
      const message = 'SkyWayの認証トークンの有効期限が切れました。';
      if (this.onFatalError) this.onFatalError(this.peer, 'token-expired', message, new Error(message));
    });

    context.onFatalError.add((err) => {
      AppLogger.error('[SkyWay] 致命的エラー', err);
      if (this.isOpen) {
        this.close();
        if (this.onClose) this.onClose(this.peer);
      }
      if (this.onFatalError) this.onFatalError(this.peer, err.name, err.message, err);
    });

    this.context = context;
  }

  private async joinLobby() {
    await this.joinLobbyChannel();
    await this.joinLobbyPerson();
  }

  private async joinLobbyChannel() {
    await this.leaveLobbyChannel();
    if (this.isDestroyed || !this.peer.isRoom || !this.context || this.context?.disposed) return;

    const lobbys: Channel[] = [];
    for (const lobbyName of this.getLobbyNames()) {
      const lobby = await SkyWayChannel.FindOrCreate(this.context, {
        name: lobbyName,
      });
      lobbys.push(lobby);
      if (lobby.members.length < 300) break;
    }

    let min = 9999;
    let joinLobbyOrNull: Channel | null = null;
    lobbys.forEach((lobby) => {
      if (min <= lobby.members.length) return;
      min = lobby.members.length;
      joinLobbyOrNull = lobby;
    });

    lobbys.forEach((lobby) => {
      if (lobby !== joinLobbyOrNull) lobby.dispose();
    });

    if (!joinLobbyOrNull) return;
    const joinLobby: Channel = joinLobbyOrNull;
    joinLobby.onClosed.add(() => {
      AppLogger.warn('[SkyWay] ロビーチャンネルが閉じられました');
      this.joinLobby();
    });

    this.lobby = joinLobby;
  }

  private async joinLobbyPerson() {
    await this.leaveLobbyPerson();
    if (this.isDestroyed || !this.peer.isRoom || !this.context || this.context?.disposed || this.lobby == null) return;

    const lobbyPerson = await this.lobby.join({
      name: this.peer.peerId,
      preventAutoLeaveOnBeforeUnload: true,
    });

    lobbyPerson.onLeft.add(() => {});

    lobbyPerson.onFatalError.add((err) => {
      AppLogger.error('[SkyWay] ロビー致命的エラー', err);
    });

    this.lobbyPerson = lobbyPerson;
  }

  private async joinRoom() {
    await this.joinRoomChannel();
    await this.joinRoomPerson();
    await this.createRoomDataStream();
  }

  private async joinRoomChannel() {
    await this.leaveRoomChannel();
    if (this.isDestroyed || !this.peer.isRoom || !this.context || this.context?.disposed) return;

    const roomName = await sha256Base64Url(`${this.peer.roomId}${this.peer.roomName}${this.peer.password}`);

    const room = await SkyWayChannel.FindOrCreate(this.context, {
      name: roomName,
    });

    room.onClosed.add(async () => {
      AppLogger.warn('[SkyWay] ルームチャンネルが閉じられました');
      await this.joinRoom();
      AppLogger.info('[SkyWay] ルーム復旧完了');
      if (this.onRoomRestore) this.onRoomRestore(this.peer);
    });

    this.room = room;
  }

  private async joinRoomPerson() {
    await this.leaveRoomPerson();
    if (this.isDestroyed || !this.peer.isRoom || !this.context || this.context?.disposed || this.room == null) return;

    const roomPerson = await this.room.join({
      name: this.peer.peerId,
      preventAutoLeaveOnBeforeUnload: true,
    });

    roomPerson.onFatalError.add((err) => {
      AppLogger.error('[SkyWay] ルーム致命的エラー', err);
      if (this.isOpen) {
        this.close();
        if (this.onClose) this.onClose(this.peer);
      }
      if (this.onFatalError) this.onFatalError(this.peer, err.name, err.message, err);
    });

    this.roomPerson = roomPerson;
  }

  private async createRoomDataStream() {
    if (this.isDestroyed || !this.peer.isRoom || !this.context || this.context?.disposed || this.roomPerson == null)
      return;
    const dataStream = await SkyWayStreamFactory.createDataStream();
    const publication = await this.roomPerson.publish(dataStream, {
      metadata: 'udonarium-data-stream',
    });

    publication.onSubscribed.add((event) => {
      const peerId = event.subscription.subscriber.name;
      if (peerId == null) {
        this.roomPerson?.unsubscribe(event.subscription).catch((error) => {
          AppLogger.warn('[SkyWay] サブスクリプション解除失敗', error);
        });
        return;
      }

      const peer = PeerContext.parse(peerId);
      if (this.onSubscribed) this.onSubscribed(peer, event.subscription);
    });

    this.publication = publication;
  }

  private async disposeContext() {
    const context = this.context;
    this.context = null;
    if (!context) return;
    context.dispose();
  }

  private async leaveLobby() {
    await this.leaveLobbyPerson();
    await this.leaveLobbyChannel();
  }

  private async leaveLobbyChannel() {
    const lobby = this.lobby;
    this.lobby = null;

    if (!lobby) return;
    lobby.onClosed.removeAllListeners();
    lobby.dispose();
  }

  private async leaveLobbyPerson() {
    const lobbyPerson = this.lobbyPerson;
    this.lobbyPerson = null;

    if (!lobbyPerson || lobbyPerson.state === 'left') return;
    lobbyPerson.onLeft.removeAllListeners();
    lobbyPerson.onFatalError.removeAllListeners();
    await lobbyPerson.leave();
  }

  private async leaveRoom() {
    await this.closeRoomDataStream();
    await this.leaveRoomPerson();
    await this.leaveRoomChannel();
  }

  private async leaveRoomChannel() {
    const room = this.room;
    this.room = null;

    if (!room) return;
    room.onMemberJoined.removeAllListeners();
    room.onMemberLeft.removeAllListeners();
    room.onMemberListChanged.removeAllListeners();
    room.onStreamPublished.removeAllListeners();
    room.onClosed.removeAllListeners();
    room.dispose();
  }

  private async leaveRoomPerson() {
    const roomPerson = this.roomPerson;
    this.roomPerson = null;

    if (!roomPerson || roomPerson.state === 'left') return;
    roomPerson.onLeft.removeAllListeners();
    roomPerson.onFatalError.removeAllListeners();
    await roomPerson.leave();
  }

  private async closeRoomDataStream() {
    const publication = this.publication;
    this.publication = null;

    if (!publication) return;
    publication.onSubscribed.removeAllListeners();
    await this.roomPerson?.unpublish(publication);
  }

  async listAllPeers(): Promise<string[]> {
    if (this.isDestroyed || !this.isOpen) return [];

    if (!this.context) return [];
    const context = this.context;
    const lobbys: Channel[] = [];
    for (const lobbyName of this.getLobbyNames()) {
      const level = Logger.level;
      Logger.level = 'disable';
      try {
        const lobby =
          this.lobby?.name === lobbyName ? this.lobby : await SkyWayChannel.Find(context, { name: lobbyName });
        lobbys.push(lobby);
      } catch (error) {
        if (error instanceof SkyWayError) {
          if (error.name != 'channelNotFound') AppLogger.error('[SkyWay] ピア一覧取得エラー', error);
        } else {
          AppLogger.error('[SkyWay] ピア一覧取得エラー', error);
        }
      }
      Logger.level = level;
    }

    const allPeerIds = lobbys.flatMap((lobby) => lobby.members.map((member) => member.name ?? '???'));

    lobbys.forEach((lobby) => {
      if (lobby.name !== this.lobby?.name) lobby.dispose();
    });
    return allPeerIds;
  }

  private getLobbyNames(): string[] {
    const names: Set<string> = new Set();
    const wildcards: Set<string> = new Set();
    let maxLobbySize = 0;

    for (const channel of ((
      this.context?.authToken as unknown as { scope?: { app?: { channels?: { name?: string }[] } } }
    )?.scope?.app?.channels ?? []) as { name?: string }[]) {
      const name = channel.name ?? '';
      if (name.startsWith('udonarium-lobby-')) {
        if (name.includes('*')) {
          wildcards.add(name);
        } else {
          names.add(name);
        }
        try {
          const regArray = /-(\d+)$/.exec(name);
          let lobbySize = regArray && 1 < regArray.length ? Number(regArray[1]) : 0;
          if (isNaN(lobbySize)) lobbySize = 0;
          if (maxLobbySize < lobbySize) maxLobbySize = lobbySize;
        } catch (e) {
          AppLogger.warn('[SkyWay] ロビー名パースエラー', e);
        }
      }
    }

    for (const wildcard of wildcards) {
      for (let i = 1; i <= maxLobbySize; i++) {
        names.add(wildcard.replace('*', `${i}`));
      }
    }

    const sorted = Array.from(names)
      .map((n) => [n, n.replace(/\d+/g, (m) => m.padStart(10, '0'))] as const)
      .sort(([, a], [, b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([n]) => n);

    return sorted;
  }
}
