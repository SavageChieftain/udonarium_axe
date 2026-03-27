import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Network } from '@axe/core/network/network';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/shared/vote';
import { AlarmWindowComponent } from '@axe/features/alarm/alarm-window/alarm-window.component';
import { ChatMessageService } from '@axe/shared/chat-message.service';
import { CutInWindowComponent } from '@axe/features/media/cut-in-window/cut-in-window.component';
import { VoteWindowComponent } from '@axe/features/vote/vote-window/vote-window.component';
import { TextViewComponent } from '@axe/shared/components/text-view/text-view.component';
import { ModalService } from '@axe/shared/modal.service';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { PanelOption, PanelService } from '@axe/shared/panel.service';

@Injectable({ providedIn: 'root' })
export class AppEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectStore = inject(ObjectStore);
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly chatMessageService = inject(ChatMessageService);

  readonly renderVersion = signal(0);
  private immediateUpdateTimer: number = null!;
  private lazyUpdateTimer: number = null!;

  initialize(): void {
    this.subscribeAlarmAndVote();
    this.subscribeCutIn();
    this.subscribeChangeDetection();
    this.subscribeNetwork();
  }

  private subscribeAlarmAndVote(): void {
    this.objectChange.alarmTimeUp$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.chatMessageService.sendSystemMessageLastSendCharactor(event.text);
    });
    this.objectChange.alarmPop$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.openAlarmPanel(event.title, String(event.time));
    });
    this.objectChange.startVote$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.openVotePanel();
    });
    this.objectChange.finishVote$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.chatMessageService.sendSystemMessageLastSendCharactor(event.text);
    });
  }

  private subscribeCutIn(): void {
    this.objectChange.startCutIn$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.openCutInPanel(event.cutIn as CutIn);
    });
    this.objectChange.stopCutIn$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (!event.cutIn) return;
    });
  }

  private subscribeChangeDetection(): void {
    this.objectChange.objectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.lazyMarkForCheck(event.isSendFromSelf);
    });
    this.objectChange.localObjectUpdated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.lazyMarkForCheck(true);
    });
    this.objectChange.objectDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.lazyMarkForCheck(event.isSendFromSelf);
    });
    this.objectChange.audioSyncList$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.lazyMarkForCheck(false);
    });
    this.objectChange.fileSyncList$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.lazyMarkForCheck(false);
    });
    this.objectChange.fileLoaded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.lazyMarkForCheck(false);
    });
  }

  private subscribeNetwork(): void {
    this.objectChange.loadConfig$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      Network.configure(event.config as Record<string, unknown>);
      Network.open();
    });
    this.objectChange.networkOpen$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      PeerCursor.myCursor.peerId = Network.peerContext.peerId;
      PeerCursor.myCursor.userId = Network.peerContext.userId;
    });
    this.objectChange.networkError$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async (event) => {
      const errorType = event.errorType;
      const errorMessage = event.errorMessage;

      const quietErrorTypes = ['peer-unavailable'];
      const reconnectErrorTypes = ['disconnected', 'socket-error', 'unavailable-id', 'authentication', 'server-error'];

      if (quietErrorTypes.includes(errorType)) return;
      await this.modalService.open(TextViewComponent, {
        title: 'ネットワークエラー',
        text: errorMessage,
      });

      if (!reconnectErrorTypes.includes(errorType)) return;
      await this.modalService.open(TextViewComponent, {
        title: 'ネットワークエラー',
        text: 'このウィンドウを閉じると再接続を試みます。',
      });
      Network.open();
    });
    this.objectChange.peerConnect$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.chatMessageService.calibrateTimeOffset();
      this.lazyMarkForCheck(true);
    });
    this.objectChange.peerDisconnect$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.lazyMarkForCheck(false);
    });
  }

  private openVotePanel(): void {
    const vote = this.objectStore.get<Vote>('Vote');
    if (!vote.chkToMe()) return;

    const option: PanelOption = { left: 0, top: 0, width: 450, height: 400 };
    option.title = '点呼/投票';

    let marginW = (window.innerWidth - option.width!) / 2;
    let marginH = (window.innerHeight - option.height!) / 2;
    if (marginW < 0) marginW = 0;
    if (marginH < 0) marginH = 0;
    option.left = marginW;
    option.top = marginH;
    this.panelService.open(VoteWindowComponent, option);
  }

  private openAlarmPanel(title: string, time: string): void {
    const winH = 100;
    const winW = 200;
    const option: PanelOption = { width: winW, height: winH, left: 300, top: 100 };
    option.title = 'アラーム ' + title;

    let marginW = window.innerWidth - winW;
    let marginH = window.innerHeight - winH - 25;
    if (marginW < 0) marginW = 0;
    if (marginH < 0) marginH = 0;

    option.width = winW;
    option.height = winH + 25;
    option.left = marginW * 0.5;
    option.top = marginH * 0.5;

    const component = this.panelService.open(AlarmWindowComponent, option);
    component.title = title;
    component.time = time;
  }

  private openCutInPanel(cutIn: CutIn): void {
    if (!cutIn) return;
    const option: PanelOption = { width: 200, height: 100, left: 300, top: 100 };
    option.title = 'カットイン : ' + cutIn.name;

    const cutinW = cutIn.width;
    const cutinH = cutIn.height;

    let marginW = window.innerWidth - cutinW;
    let marginH = window.innerHeight - cutinH - 25;
    if (marginW < 0) marginW = 0;
    if (marginH < 0) marginH = 0;

    option.width = cutinW;
    option.height = cutinH + 25;
    option.left = (marginW * cutIn.x_pos) / 100;
    option.top = (marginH * cutIn.y_pos) / 100;
    option.isCutIn = true;
    option.cutInIdentifier = cutIn.identifier;

    const component = this.panelService.open(CutInWindowComponent, option);
    component.cutIn = cutIn;
    component.startCutIn();
  }

  private lazyMarkForCheck(isImmediate: boolean): void {
    if (isImmediate) {
      if (this.immediateUpdateTimer !== null) return;
      this.immediateUpdateTimer = requestAnimationFrame(() => {
        this.immediateUpdateTimer = null!;
        if (this.lazyUpdateTimer !== null) {
          cancelAnimationFrame(this.lazyUpdateTimer);
          this.lazyUpdateTimer = null!;
        }
        this.renderVersion.update((v) => v + 1);
      });
    } else {
      if (this.lazyUpdateTimer !== null) return;
      this.lazyUpdateTimer = requestAnimationFrame(() => {
        this.lazyUpdateTimer = null!;
        if (this.immediateUpdateTimer !== null) {
          cancelAnimationFrame(this.immediateUpdateTimer);
          this.immediateUpdateTimer = null!;
        }
        this.renderVersion.update((v) => v + 1);
      });
    }
  }
}
