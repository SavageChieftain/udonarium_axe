import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { Network } from '@axe/core/network/network';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

@Injectable({ providedIn: 'root' })
export class NetworkEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatMessageService = inject(ChatMessageService);

  constructor() {
    this.objectChange.loadConfig$.subscribe((event) => {
      Network.configure(event.config as Record<string, unknown>);
      Network.openStandby();
    }, this.destroyRef);
    this.objectChange.networkOpen$.subscribe(() => {
      PeerCursor.myCursor.peerId = Network.peerContext.peerId;
      PeerCursor.myCursor.userId = Network.peerContext.userId;
    }, this.destroyRef);
    this.objectChange.networkError$.subscribe((event) => {
      const { errorType, errorMessage } = event;
      const quietErrorTypes = ['peer-unavailable'];
      if (quietErrorTypes.includes(errorType)) return;

      const userMessage = this.resolveNetworkErrorMessage(errorType, errorMessage);
      this.chatMessageService.sendSystemMessage(userMessage);

      const noReconnectErrorTypes = ['server-error'];
      if (noReconnectErrorTypes.includes(errorType)) return;

      this.chatMessageService.sendSystemMessage('再接続を試みます...');
      Network.openStandby();
    }, this.destroyRef);
    this.objectChange.peerConnect$.subscribe(() => {
      this.chatMessageService.calibrateTimeOffset();
    }, this.destroyRef);
  }

  private resolveNetworkErrorMessage(errorType: string, _errorMessage: string): string {
    switch (errorType) {
      case 'server-error':
        return 'SkyWayのバックエンドサーバに接続できません。ネットワーク設定を確認してください。';
      case 'token-expired':
        return 'SkyWayの認証トークンが期限切れになりました。再接続します。';
      default:
        return `ネットワークエラーが発生しました。(${errorType})`;
    }
  }
}
