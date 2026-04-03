import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Network } from '@axe/core/network/network';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/shared/vote';
import { AlarmWindowComponent } from '@axe/features/alarm/alarm-window/alarm-window.component';
import { CutInWindowComponent } from '@axe/features/media/cut-in-window/cut-in-window.component';
import { VoteWindowComponent } from '@axe/features/vote/vote-window/vote-window.component';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';

@Injectable({ providedIn: 'root' })
export class AppEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectStore = inject(ObjectStore);
  private readonly panelService = inject(PanelService);
  private readonly chatMessageService = inject(ChatMessageService);

  readonly renderVersion = signal(0);
  private immediateUpdateTimer: number | null = null;
  private lazyUpdateTimer: number | null = null;

  initialize(): void {
    this.subscribeAlarmAndVote();
    this.subscribeCutIn();
    this.subscribeChangeDetection();
    this.subscribeNetwork();
  }

  private subscribeAlarmAndVote(): void {
    this.objectChange.alarmTimeUp$.subscribe((event) => {
      this.chatMessageService.sendSystemMessageLastSendCharactor(event.text);
    }, this.destroyRef);
    this.objectChange.alarmPop$.subscribe((event) => {
      this.openAlarmPanel(event.title, String(event.time));
    }, this.destroyRef);
    this.objectChange.startVote$.subscribe(() => {
      this.openVotePanel();
    }, this.destroyRef);
    this.objectChange.finishVote$.subscribe((event) => {
      this.chatMessageService.sendSystemMessageLastSendCharactor(event.text);
    }, this.destroyRef);
  }

  private subscribeCutIn(): void {
    this.objectChange.startCutIn$.subscribe((event) => {
      this.openCutInPanel(event.cutIn as CutIn);
    }, this.destroyRef);
  }

  private subscribeChangeDetection(): void {
    this.objectChange.objectChanged$.subscribe((event) => {
      this.scheduleRender(event.isSendFromSelf);
    }, this.destroyRef);
    this.objectChange.localObjectUpdated$.subscribe(() => {
      this.scheduleRender(true);
    }, this.destroyRef);
    this.objectChange.objectDeleted$.subscribe((event) => {
      this.scheduleRender(event.isSendFromSelf);
    }, this.destroyRef);
    this.objectChange.audioSyncList$.subscribe(() => {
      this.scheduleRender(false);
    }, this.destroyRef);
    this.objectChange.fileSyncList$.subscribe(() => {
      this.scheduleRender(false);
    }, this.destroyRef);
    this.objectChange.fileLoaded$.subscribe(() => {
      this.scheduleRender(false);
    }, this.destroyRef);
  }

  private subscribeNetwork(): void {
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

      const noReconnectErrorTypes = ['server-error'];

      const userMessage = this.resolveNetworkErrorMessage(errorType, errorMessage);
      this.chatMessageService.sendSystemMessage(userMessage);

      if (noReconnectErrorTypes.includes(errorType)) return;

      this.chatMessageService.sendSystemMessage('再接続を試みます...');
      Network.openStandby();
    }, this.destroyRef);
    this.objectChange.peerConnect$.subscribe(() => {
      this.chatMessageService.calibrateTimeOffset();
      this.scheduleRender(true);
    }, this.destroyRef);
    this.objectChange.peerDisconnect$.subscribe(() => {
      this.scheduleRender(false);
    }, this.destroyRef);
  }

  private openVotePanel(): void {
    const vote = this.objectStore.get<Vote>('Vote');
    if (!vote?.chkToMe()) return;

    const width = 450;
    const height = 400;
    const option: PanelOption = {
      title: '点呼/投票',
      width,
      height,
      left: Math.max(0, (window.innerWidth - width) / 2),
      top: Math.max(0, (window.innerHeight - height) / 2),
    };
    this.panelService.open(VoteWindowComponent, option);
  }

  private openAlarmPanel(title: string, time: string): void {
    const winW = 200;
    const winH = 100;
    const marginW = Math.max(0, window.innerWidth - winW);
    const marginH = Math.max(0, window.innerHeight - winH - 25);

    const option: PanelOption = {
      title: 'アラーム ' + title,
      width: winW,
      height: winH + 25,
      left: marginW * 0.5,
      top: marginH * 0.5,
    };

    const component = this.panelService.open(AlarmWindowComponent, option);
    component.title = title;
    component.time = time;
  }

  private openCutInPanel(cutIn: CutIn): void {
    if (!cutIn) return;
    const marginW = Math.max(0, window.innerWidth - cutIn.width);
    const marginH = Math.max(0, window.innerHeight - cutIn.height - 25);

    const option: PanelOption = {
      title: 'カットイン : ' + cutIn.name,
      width: cutIn.width,
      height: cutIn.height + 25,
      left: (marginW * cutIn.x_pos) / 100,
      top: (marginH * cutIn.y_pos) / 100,
      isCutIn: true,
      cutInIdentifier: cutIn.identifier,
    };

    const component = this.panelService.open(CutInWindowComponent, option);
    component.cutIn = cutIn;
    component.startCutIn();
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

  private scheduleRender(isImmediate: boolean): void {
    if (isImmediate) {
      if (this.immediateUpdateTimer !== null) return;
      this.immediateUpdateTimer = requestAnimationFrame(() => {
        this.immediateUpdateTimer = null;
        if (this.lazyUpdateTimer !== null) {
          cancelAnimationFrame(this.lazyUpdateTimer);
          this.lazyUpdateTimer = null;
        }
        this.renderVersion.update((v) => v + 1);
      });
    } else {
      if (this.lazyUpdateTimer !== null) return;
      this.lazyUpdateTimer = requestAnimationFrame(() => {
        this.lazyUpdateTimer = null;
        if (this.immediateUpdateTimer !== null) {
          cancelAnimationFrame(this.immediateUpdateTimer);
          this.immediateUpdateTimer = null;
        }
        this.renderVersion.update((v) => v + 1);
      });
    }
  }
}
