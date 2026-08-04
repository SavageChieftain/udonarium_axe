import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { encodeI18nMessage } from '@axe/application/i18n/i18n-message';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PeerReconnectState } from '@axe/core/network/connection';
import { Network } from '@axe/core/network/network';
import { loadIdentity, saveIdentity } from '@axe/core/storage/identity-storage';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

@Injectable({ providedIn: 'root' })
export class NetworkEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatMessageService = inject(ChatMessageService);

  /**
   * server-error（トークンバックエンドに到達できない）時の自動再接続の上限とバックオフ。
   * トークン取得側のリトライで吸収しきれない長いコールドスタートに備えつつ、
   * 恒久障害での無限再接続ループ（システムメッセージ連発）を上限で防ぐ。
   */
  private static readonly MAX_SERVER_ERROR_RECONNECTS = 3;
  private static readonly SERVER_ERROR_RECONNECT_BACKOFF_MS = [3000, 8000, 15000];
  private static readonly RECONNECT_MESSAGE_KEYS: Record<PeerReconnectState, string> = {
    retrying: 'feature.lobby.peerReconnect.retrying',
    recovered: 'feature.lobby.peerReconnect.recovered',
    failed: 'feature.lobby.peerReconnect.failed',
  };
  private serverErrorReconnectAttempts = 0;
  private serverErrorReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.objectChange.loadConfig$.subscribe((event) => {
      Network.configure(event.config as Record<string, unknown>);
      Network.openStandby(loadIdentity()?.userId);
    }, this.destroyRef);
    this.objectChange.networkOpen$.subscribe(() => {
      this.resetServerErrorReconnect();
      const peer = Network.peerContext;
      PeerCursor.myCursor.peerId = peer.peerId;
      PeerCursor.myCursor.userId = peer.userId;
      saveIdentity({
        userId: peer.userId,
        roomId: peer.roomId,
        roomName: peer.roomName,
        role: PeerCursor.myCursor.role,
        reConnectPass: PeerCursor.myCursor.reConnectPass,
      });
    }, this.destroyRef);
    this.objectChange.networkError$.subscribe((event) => {
      const { errorType, errorMessage } = event;
      const quietErrorTypes = ['peer-unavailable'];
      if (quietErrorTypes.includes(errorType)) return;

      // server-error はコールドスタートの遅延を見込み、回数上限つきでバックオフ再接続する。
      // 上限を超えたら恒久障害とみなして通知し、無限ループを避けて打ち切る。
      if (errorType === 'server-error') {
        this.handleServerErrorReconnect();
        return;
      }

      this.chatMessageService.sendSystemMessage(this.resolveNetworkErrorMessage(errorType, errorMessage));
      this.chatMessageService.sendSystemMessage(encodeI18nMessage('feature.lobby.errors.reconnecting'));
      Network.openStandby(loadIdentity()?.userId);
    }, this.destroyRef);
    this.objectChange.peerConnect$.subscribe(() => {
      this.chatMessageService.calibrateTimeOffset();
    }, this.destroyRef);
    this.objectChange.peerReconnect$.subscribe((event) => {
      const key = NetworkEventHandlerService.RECONNECT_MESSAGE_KEYS[event.state];
      if (!key) return;
      this.chatMessageService.sendSystemMessage(encodeI18nMessage(key, { name: this.resolvePeerName(event.peerId) }));
    }, this.destroyRef);
    this.objectChange.onObjectChangedForAlias(
      ['PeerCursor'],
      (event) => {
        const myCursor = PeerCursor.myCursor;
        if (!myCursor || event.identifier !== myCursor.identifier) return;
        const peer = Network.peerContext;
        if (!peer?.isRoom) return;
        saveIdentity({
          userId: peer.userId,
          roomId: peer.roomId,
          roomName: peer.roomName,
          role: myCursor.role,
          reConnectPass: myCursor.reConnectPass,
        });
      },
      this.destroyRef
    );
  }

  private handleServerErrorReconnect(): void {
    if (this.serverErrorReconnectAttempts >= NetworkEventHandlerService.MAX_SERVER_ERROR_RECONNECTS) {
      this.chatMessageService.sendSystemMessage(encodeI18nMessage('feature.lobby.errors.skywayServer'));
      return;
    }

    const backoff = NetworkEventHandlerService.SERVER_ERROR_RECONNECT_BACKOFF_MS;
    const delayMs = backoff[this.serverErrorReconnectAttempts] ?? backoff[backoff.length - 1];
    this.serverErrorReconnectAttempts++;

    this.chatMessageService.sendSystemMessage(encodeI18nMessage('feature.lobby.errors.reconnecting'));

    if (this.serverErrorReconnectTimer != null) clearTimeout(this.serverErrorReconnectTimer);
    this.serverErrorReconnectTimer = setTimeout(() => {
      this.serverErrorReconnectTimer = null;
      Network.openStandby(loadIdentity()?.userId);
    }, delayMs);
  }

  private resetServerErrorReconnect(): void {
    this.serverErrorReconnectAttempts = 0;
    if (this.serverErrorReconnectTimer != null) {
      clearTimeout(this.serverErrorReconnectTimer);
      this.serverErrorReconnectTimer = null;
    }
  }

  private resolvePeerName(peerId: string): string {
    const cursor = PeerCursor.findByPeerId(peerId);
    if (cursor?.name) return cursor.name;
    if (cursor?.userId) return cursor.userId.slice(0, 6);
    return peerId.slice(0, 6);
  }

  private resolveNetworkErrorMessage(errorType: string, _errorMessage: string): string {
    switch (errorType) {
      case 'server-error':
        return encodeI18nMessage('feature.lobby.errors.skywayServer');
      case 'token-expired':
        return encodeI18nMessage('feature.lobby.errors.tokenExpired');
      default:
        return encodeI18nMessage('feature.lobby.errors.generic', { errorType });
    }
  }
}
