import { NgClass } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Network } from '@axe/core/index';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerCoordinate } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { callCursorMove, callHeartBeat } from '@axe/domain/domain-events';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { BatchService } from '@axe/shared/ui/batch.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'peer-cursor, [peer-cursor]',
  templateUrl: './peer-cursor.component.html',
  styleUrls: ['./peer-cursor.component.css'],
  imports: [NgClass, SafePipe],
})
export class PeerCursorComponent implements OnInit, AfterViewInit, OnDestroy {
  private batchService = inject(BatchService);
  private coordinateService = inject(CoordinateService);
  private chatMessageService = inject(ChatMessageService);
  private destroyRef = inject(DestroyRef);
  private objectChange = inject(ObjectChangeService);
  private objectStore = inject(ObjectStore);

  readonly cursorElementRef = viewChild<ElementRef>('cursor');
  readonly opacityElementRef = viewChild<ElementRef>('opacity');
  readonly cursor = input(PeerCursor.myCursor);

  get iconUrl(): string {
    return this.cursor().image.url;
  }
  get name(): string {
    return this.cursor().name;
  }
  get isMine(): boolean {
    return this.cursor().isMine;
  }
  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList');
  }

  private cursorElement: HTMLElement = null!;
  private opacityElement: HTMLElement = null!;
  private fadeOutTimer: ResettableTimeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private timestampInterval: NodeJS.Timeout | null = null;
  private timestampIntervalEnable = false;

  private callcack: (e: Event) => void = (e) => this.onMouseMove(e);

  private _x = 0;
  private _y = 0;
  private _target!: HTMLElement;

  networkService = Network;

  get delayMs(): number {
    const maxDelay = Network.peerIds.length * 16.6;
    return maxDelay < 100 ? 100 : maxDelay;
  }

  get delayMsHb(): number {
    const maxDelay = Network.peerIds.length * 166;
    return maxDelay < 1000 ? 1000 : maxDelay;
  }

  ngOnInit() {
    if (!this.isMine) {
      this.objectChange.cursorMove$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        if (event.sendFrom !== this.cursor().peerId) return;
        this.batchService.add(() => {
          this.stopTransition();
          this.setAnimatedTransition();
          this.setPosition(event.x, event.y, event.z);
          this.resetFadeOut();
        }, this);
      });

      this.objectChange.heartBeat$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        if (event.sendFrom !== this.cursor().peerId) return;

        this.batchService.add(() => {
          this.cursor().timestampSend = event.timestamp;
          this.cursor().timestampReceive = Date.now();
          this.cursor().timeDiffDown =
            this.cursor().timestampReceive - this.cursor().timestampSend + PeerCursor.myCursor.debugReceiveDelay;

          const messId = event.id;
          const diffUp = event.diffDown;
          this.cursor().lastTimeSignNo = event.secdCounter;
          if (this.cursor().firstTimeSignNo < 0) {
            this.cursor().firstTimeSignNo = event.secdCounter;
          }
          this.cursor().totalTimeSignNum++;

          if (messId == PeerCursor.myCursor.peerId) {
            if (diffUp != null) {
              this.cursor().timeDiffUp = diffUp;
              this.cursor().timeLatency = diffUp + this.cursor().timeDiffDown;
            }
          }
        }, this);
      });
    }
  }

  private chkDisConnect() {
    const timeout = PeerCursor.myCursor.timeout * 1000;
    const elapsedTime = Date.now() - this.cursor().timestampReceive;

    const chatTabList = this.objectStore.get<ChatTabList>('ChatTabList');
    const sysTab = chatTabList.systemMessageTab;

    if (timeout <= elapsedTime) {
      if (!this.cursor().isDisConnect) {
        this.cursor().isDisConnect = true;
        if (sysTab) {
          const text =
            this.cursor().userId +
            '[' +
            this.cursor().name +
            '] さんからあなたへの接続確認信号が' +
            PeerCursor.myCursor.timeout +
            '秒以上受信できません。通信障害の可能性があります。';
          this.chatMessageService.sendSystemMessageOnePlayer(sysTab, text, PeerCursor.myCursor.identifier, '#006633');
        }
      }
    } else {
      if (this.cursor().isDisConnect) {
        setTimeout(() => {
          this.timestampInterval = null;
          const text = 'あなたと' + this.cursor().userId + '[' + this.cursor().name + '] さんの接続を確認しました。';
          if (sysTab) {
            this.chatMessageService.sendSystemMessageOnePlayer(sysTab, text, PeerCursor.myCursor.identifier, '#006633');
          }
        }, 1000);
      }
      this.cursor().isDisConnect = false;
    }
  }

  private logoutMessage() {
    if (!this.cursor()) return;
    const chatTabList = this.objectStore.get<ChatTabList>('ChatTabList');
    if (!chatTabList) return;
    const sysTab = chatTabList.systemMessageTab;
    if (sysTab) {
      const text = this.cursor().userId + '[' + this.cursor().name + '] さんがログアウトしました。';
      this.chatMessageService.sendSystemMessageOnePlayer(sysTab, text, PeerCursor.myCursor.identifier, '#006633');
    }
  }

  private secdCounter = 0;
  private indexCounter = 0;

  private timestampLoop() {
    if (!this.timestampIntervalEnable) return;
    if (!this.timestampInterval) {
      this.timestampInterval = setTimeout(() => {
        this.timestampInterval = null;

        if (PeerCursor.myCursor.peerId == this.cursor().peerId) {
          const peerlength = this.networkService.peerContexts.length;
          if (peerlength) {
            if (peerlength <= this.indexCounter) this.indexCounter = 0;
            const timestanmp = Date.now() + PeerCursor.myCursor.debugTimeShift;
            const peerContext = this.networkService.peerContexts[this.indexCounter] || null;
            let id = '';
            if (peerContext) {
              if (this.networkService.peerContexts[this.indexCounter].isOpen) {
                id = this.networkService.peerContexts[this.indexCounter].peerId;
              }
            }

            const peerCursor = PeerCursor.findByPeerId(id);
            const diffDown = peerCursor ? peerCursor.timeDiffDown : null;

            callHeartBeat([timestanmp, id, diffDown, this.secdCounter]);
            this.indexCounter++;
            this.secdCounter++;
          }
        } else {
          this.chkDisConnect();
        }

        this.timestampLoop();
      }, this.delayMsHb);
    }
  }

  ngAfterViewInit() {
    if (this.isMine) {
      document.body.addEventListener('mousemove', this.callcack);
      document.body.addEventListener('touchmove', this.callcack);
    } else {
      this.cursorElement = this.cursorElementRef()?.nativeElement;
      this.opacityElement = this.opacityElementRef()?.nativeElement;
      this.setAnimatedTransition();
      this.setPosition(0, 0, 0);
      this.resetFadeOut();
    }

    this.timestampIntervalEnable = true;
    this.timestampLoop();
  }

  ngOnDestroy() {
    this.logoutMessage();

    document.body.removeEventListener('mousemove', this.callcack);
    document.body.removeEventListener('touchmove', this.callcack);
    this.batchService.remove(this);
    if (this.fadeOutTimer) this.fadeOutTimer.clear();

    if (this.updateInterval) {
      clearTimeout(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.timestampInterval) {
      clearTimeout(this.timestampInterval);
      this.timestampInterval = null;
    }
    this.timestampIntervalEnable = false;
  }

  private onMouseMove(e: Event) {
    const x = (e as TouchEvent).touches ? (e as TouchEvent).changedTouches[0].pageX : (e as MouseEvent).pageX;
    const y = (e as TouchEvent).touches ? (e as TouchEvent).changedTouches[0].pageY : (e as MouseEvent).pageY;
    if (x === this._x && y === this._y) return;
    this._x = x;
    this._y = y;
    this._target = e.target as HTMLElement;
    if (!this.updateInterval) {
      this.updateInterval = setTimeout(() => {
        this.updateInterval = null;
        this.calcLocalCoordinate(this._x, this._y, this._target);
      }, this.delayMs);
    }
  }

  private calcLocalCoordinate(x: number, y: number, target: HTMLElement) {
    if (!target.closest('#app-table-layer')) return;

    let coordinate: PointerCoordinate = { x, y, z: 0 };
    coordinate = this.coordinateService.calcTabletopLocalCoordinate(coordinate, target);

    callCursorMove([coordinate.x, coordinate.y, coordinate.z]);
  }

  private resetFadeOut() {
    this.opacityElement.style.opacity = '1.0';
    if (this.fadeOutTimer == null) {
      this.fadeOutTimer = new ResettableTimeout(() => {
        this.opacityElement.style.opacity = '0.0';
      }, 3000);
    }
    this.fadeOutTimer.reset();
  }

  private stopTransition() {
    this.cursorElement.style.transform = window.getComputedStyle(this.cursorElement).transform;
  }

  private setAnimatedTransition() {
    this.cursorElement.style.transition = `transform ${this.delayMs + 33}ms linear, opacity 0.5s ease-out`;
  }

  private setPosition(x: number, y: number, z: number) {
    this.cursorElement.style.transform = `translateX(${x.toFixed(4)}px) translateY(${y.toFixed(4)}px) translateZ(${z.toFixed(4)}px)`;
  }
}
