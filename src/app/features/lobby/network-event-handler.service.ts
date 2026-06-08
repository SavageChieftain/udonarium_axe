import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { encodeI18nMessage } from '@axe/application/i18n/i18n-message';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { Network } from '@axe/core/network/network';
import { loadIdentity, saveIdentity } from '@axe/core/storage/identity-storage';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

@Injectable({ providedIn: 'root' })
export class NetworkEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatMessageService = inject(ChatMessageService);

  constructor() {
    this.objectChange.loadConfig$.subscribe((event) => {
      Network.configure(event.config as Record<string, unknown>);
      Network.openStandby(loadIdentity()?.userId);
    }, this.destroyRef);
    this.objectChange.networkOpen$.subscribe(() => {
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

      const userMessage = this.resolveNetworkErrorMessage(errorType, errorMessage);
      this.chatMessageService.sendSystemMessage(userMessage);

      const noReconnectErrorTypes = ['server-error'];
      if (noReconnectErrorTypes.includes(errorType)) return;

      this.chatMessageService.sendSystemMessage(encodeI18nMessage('feature.lobby.errors.reconnecting'));
      Network.openStandby(loadIdentity()?.userId);
    }, this.destroyRef);
    this.objectChange.peerConnect$.subscribe(() => {
      this.chatMessageService.calibrateTimeOffset();
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
