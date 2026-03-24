import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { EventSystem } from '@axe/core/index';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';
import { setZeroTimeout } from '@axe/core/util/zero-timeout';
import { ChatMessage, ChatMessageContext } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatMessageComponent } from '@axe/features/chat/chat-message/chat-message.component';
import { PanelService } from '@axe/shared/panel.service';
import { UiSignalService } from '@axe/shared/ui-signal.service';

type ScrollPosition = { top: number; bottom: number; clientHeight: number; scrollHeight: number };

const ua = window.navigator.userAgent.toLowerCase();
const isiOS =
  ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || (ua.indexOf('macintosh') > -1 && 'ontouchend' in document);

@Component({
  selector: 'chat-tab',
  templateUrl: './chat-tab.component.html',
  styleUrls: ['./chat-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatMessageComponent],
})
export class ChatTabComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges, AfterViewChecked {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private objectStore = inject(ObjectStore);
  private uiSignalService = inject(UiSignalService);

  constructor() {
    effect(() => {
      this.uiSignalService.chatRedrawVersion();
      setTimeout(() => this.redraw(), 0);
    });
  }

  sampleMessages: ChatMessageContext[] = [
    {
      from: 'System',
      timestamp: 0,
      imageIdentifier: '',
      tag: '',
      name: 'チュートリアル',
      text: 'サーバーを使用しないTRPGオンセツールです。参加者同士で接続し、コマや画像ファイルなどを同期します。',
    },
    {
      from: 'System',
      timestamp: 0,
      imageIdentifier: '',
      tag: '',
      name: 'チュートリアル',
      text: '全てのデータが各参加者のブラウザ内にあるため、ルームの状態を次回に持ち越したい場合は、必ず「保存」を実行してセーブデータ（zip）を生成してください。保存したzipの読み込みはブラウザ画面へのファイルドロップで行えます。',
    },
    {
      from: 'System',
      to: '???',
      timestamp: 0,
      imageIdentifier: '',
      tag: '',
      name: 'チュートリアル > プレイヤー',
      text: 'ダイレクトメッセージ（秘密会話）はセーブデータに記録されません。',
    },
    {
      from: 'System',
      to: '???',
      timestamp: 0,
      imageIdentifier: '',
      tag: '',
      name: 'チュートリアル > プレイヤー',
      text: 'また、過去のダイレクトメッセージはあなたのIDが更新されると同じルーム内であっても見えなくなります。注意してください。',
    },
    {
      from: 'System',
      timestamp: 0,
      imageIdentifier: '',
      tag: '',
      name: 'チュートリアル',
      text: '動作推奨環境はデスクトップChromeです。今のところ、スマホからだと上手く操作できません。',
    },
    {
      from: 'System',
      timestamp: 0,
      imageIdentifier: '',
      tag: '',
      name: 'チュートリアル',
      text: 'リリィ追加機能：チャット簡易表示機能は最初のチャット入力を入力すると使用可能になります。',
    },
    {
      from: 'System',
      timestamp: 0,
      imageIdentifier: '',
      tag: '',
      name: 'チュートリアル',
      text: 'チュートリアルは以上です。このチュートリアルは最初のチャットを入力すると非表示になります。',
    },
  ];

  private topTimestamp = 0;
  private botomTimestamp = 0;

  private needUpdate = true;

  @ViewChild('logContainer', { static: true }) logContainerRef: ElementRef<HTMLDivElement>;
  @ViewChild('messageContainer', { static: true }) messageContainerRef: ElementRef<HTMLDivElement>;

  private topElm: HTMLElement = null!;
  private bottomElm: HTMLElement = null!;
  private topElmBox: ClientRect | null = null!;
  private bottomElmBox: ClientRect | null = null!;
  private topIndex = 0;
  private bottomIndex = 0;

  private _minMessageHeight = 26;
  private _minMessageHeightNormal = 61;

  get minMessageHeight() {
    if (this.chatTab) {
      if (this.chatTab.chatSimpleDispFlag) {
        return this._minMessageHeight;
      }
    }
    return this._minMessageHeightNormal;
  }

  private preScrollTop = 0;
  private scrollSpeed = 0;

  private _chatMessages: ChatMessage[] = [];
  get chatMessages(): ChatMessage[] {
    if (!this.chatTab) return [];
    if (this.needUpdate) {
      this.needUpdate = false;
      const chatMessages = this.chatTab ? this.chatTab.chatMessages : [];
      this.adjustIndex();
      this._chatMessages = chatMessages.slice(this.topIndex, this.bottomIndex + 1);
      this.topTimestamp = 0 < this._chatMessages.length ? this._chatMessages[0].timestamp : 0;
      this.botomTimestamp =
        0 < this._chatMessages.length ? this._chatMessages[this._chatMessages.length - 1].timestamp : 0;
    }
    return this._chatMessages;
  }

  private chatMessagesDisplayableTopIndex(chatMessages: ChatMessage[], dispLength: number): number {
    const len = chatMessages.length;
    let count = 0;
    let i = len - 1;
    for (; i >= 0; i--) {
      if (chatMessages[i].isDisplayable) count++;
      if (count >= dispLength) return i;
    }
    return i;
  }

  get minScrollHeight(): number {
    //    let length = this.chatTab ? this.chatTab.chatMessages.length : this.sampleMessages.length;
    const length = this.chatTab ? this.chatTab.displayableMessagesLength() : this.sampleMessages.length;
    return (length < 10000 ? length : 10000) * this.minMessageHeight;
  }

  get topSpace(): number {
    return this.minScrollHeight - this.bottomSpace;
  }
  get bottomSpace(): number {
    return 0 < this.chatMessages.length
      ? (this.chatTab.chatMessages.length - this.bottomIndex - 1) * this.minMessageHeight
      : 0;
  }

  private scrollEventShortTimer: ResettableTimeout = null!;
  private scrollEventLongTimer: ResettableTimeout = null!;
  private addMessageEventTimer: NodeJS.Timeout | null = null!;
  private callbackOnScroll: () => void = () => this.onScroll();
  private callbackOnScrollToBottom: () => void = () => this.resetMessages();

  @Input() chatTab: ChatTab;
  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList');
  }

  @Output() addMessage: EventEmitter<null> = new EventEmitter();

  ngOnInit() {
    const messages: ChatMessage[] = [];
    for (const context of this.sampleMessages) {
      const message = new ChatMessage();
      const ctx = context as Record<string, string | number | undefined>;
      for (const key in context) {
        if (key === 'identifier') continue;
        if (key === 'tabIdentifier') continue;
        if (key === 'text') {
          message.value = ctx[key] as string;
          continue;
        }
        if (ctx[key] == null || ctx[key] === '') continue;
        message.setAttribute(key, ctx[key] as string | number);
      }
      messages.push(message);
    }
    this.sampleMessages = messages;

    EventSystem.register(this)
      .on('MESSAGE_ADDED', (event) => {
        const message = this.objectStore.get<ChatMessage>(event.data.messageIdentifier);
        if (!message || !this.chatTab.contains(message)) return;

        if (this.topTimestamp <= message.timestamp) {
          this.changeDetector.markForCheck();
          this.needUpdate = true;
          this.onMessageInit();
        }
      })
      .on('UPDATE_GAME_OBJECT', (event) => {
        const message = this.objectStore.get(event.data.identifier);
        if (
          message &&
          message instanceof ChatMessage &&
          this.topTimestamp <= message.timestamp &&
          message.timestamp <= this.botomTimestamp &&
          this.chatTab.contains(message)
        ) {
          this.changeDetector.markForCheck();
        }
      });
  }

  ngAfterViewInit() {
    this.scrollEventShortTimer = new ResettableTimeout(() => this.lazyScrollUpdate(), 33);
    this.scrollEventLongTimer = new ResettableTimeout(() => this.lazyScrollUpdate(false), 66);
    this.onScroll();
    this.panelService.scrollablePanel.addEventListener('scroll', this.callbackOnScroll, false);
    this.panelService.scrollablePanel.addEventListener('scrolltobottom', this.callbackOnScrollToBottom, false);
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    if (this.panelService.scrollablePanel) {
      this.panelService.scrollablePanel.removeEventListener('scroll', this.callbackOnScroll, false);
      this.panelService.scrollablePanel.removeEventListener('scrolltobottom', this.callbackOnScrollToBottom, false);
    }
    if (this.scrollEventShortTimer) this.scrollEventShortTimer.clear();
    if (this.scrollEventLongTimer) this.scrollEventLongTimer.clear();
    if (this.addMessageEventTimer) clearTimeout(this.addMessageEventTimer);
    this.addMessageEventTimer = null!;
  }

  ngOnChanges() {
    if (this.panelService?.scrollablePanel) {
      this.resetMessages();
    } else {
      queueMicrotask(() => this.resetMessages());
    }
  }

  ngAfterViewChecked() {
    if (!this.topElm || !this.bottomElm) return;
    queueMicrotask(() => this.adjustScrollPosition());
  }

  onMessageInit() {
    if (this.addMessageEventTimer != null) return;
    this.addMessageEventTimer = setTimeout(() => {
      this.addMessageEventTimer = null!;
      this.addMessage.emit();
    }, 0);
  }

  resetMessages() {
    if (!this.chatTab || !this.panelService?.scrollablePanel) return;
    const lastIndex = this.chatTab.chatMessages.length - 1;
    //    this.topIndex = lastIndex - Math.floor(this.panelService.scrollablePanel.clientHeight / this.minMessageHeight);
    this.topIndex = this.chatMessagesDisplayableTopIndex(
      this.chatTab.chatMessages,
      Math.floor(this.panelService.scrollablePanel.clientHeight / this.minMessageHeight) + 1
    );
    this.bottomIndex = lastIndex;
    this.needUpdate = true;
    this.preScrollTop = -1;
    this.scrollSpeed = 0;
    this.topElm = this.bottomElm = null!;
    this.adjustIndex();
    this.changeDetector.markForCheck();
  }

  trackByChatMessage(index: number, message: ChatMessage) {
    return message.identifier;
  }

  private adjustIndex() {
    const chatMessages = this.chatTab ? this.chatTab.chatMessages : [];
    const lastIndex = 0 < chatMessages.length ? chatMessages.length - 1 : 0;

    if (this.topIndex < 0) {
      this.topIndex = 0;
    }
    if (lastIndex < this.bottomIndex) {
      this.bottomIndex = lastIndex;
    }

    if (this.topIndex < 0) this.topIndex = 0;
    if (this.bottomIndex < 0) this.bottomIndex = 0;
    if (lastIndex < this.topIndex) this.topIndex = lastIndex;
    if (lastIndex < this.bottomIndex) this.bottomIndex = lastIndex;
  }

  private getScrollPosition(): ScrollPosition {
    let top = this.panelService.scrollablePanel.scrollTop;
    const clientHeight = this.panelService.scrollablePanel.clientHeight;
    const scrollHeight = this.panelService.scrollablePanel.scrollHeight;
    if (top < 0) top = 0;
    if (scrollHeight - clientHeight < top) top = scrollHeight - clientHeight;
    const bottom = top + clientHeight;
    return { top, bottom, clientHeight, scrollHeight };
  }

  private adjustScrollPosition() {
    if (!this.topElm || !this.bottomElm) return;

    const hasTopElm = this.logContainerRef.nativeElement.contains(this.topElm);
    const hasBotomElm = this.logContainerRef.nativeElement.contains(this.bottomElm);

    const { hasTopBlank, hasBotomBlank } = this.checkBlank(hasTopElm, hasBotomElm);

    this.topElm = this.bottomElm = null!;

    if (hasTopBlank || hasBotomBlank || (!hasTopElm && !hasBotomElm)) {
      setZeroTimeout(() => this.lazyScrollUpdate());
    }
  }

  private checkBlank(hasTopElm: boolean, hasBotomElm: boolean) {
    let hasTopBlank = !hasTopElm;
    let hasBotomBlank = !hasBotomElm;

    if (!hasTopElm && !hasBotomElm) return { hasTopBlank, hasBotomBlank };

    let elm: HTMLElement = null!;
    let prevBox: ClientRect | null = null;
    if (hasBotomElm) {
      elm = this.bottomElm;
      prevBox = this.bottomElmBox;
    } else if (hasTopElm) {
      elm = this.topElm;
      prevBox = this.topElmBox;
    }
    const currentBox = elm.getBoundingClientRect();
    const diff = (prevBox?.top ?? 0) - currentBox.top - this.scrollSpeed;
    if ((!hasTopBlank || !hasBotomBlank) && 0.5 ** 2 < diff ** 2) {
      this.panelService.scrollablePanel.scrollTop -= diff;
    }

    const logBox: ClientRect = this.logContainerRef.nativeElement.getBoundingClientRect();
    const messageBox: ClientRect = this.messageContainerRef.nativeElement.getBoundingClientRect();

    const messageBoxTop = messageBox.top - logBox.top;
    const messageBoxBottom = messageBoxTop + messageBox.height;

    const scrollPosition = this.getScrollPosition();

    hasTopBlank = scrollPosition.top < messageBoxTop;
    hasBotomBlank = messageBoxBottom < scrollPosition.bottom && scrollPosition.bottom < scrollPosition.scrollHeight;

    return { hasTopBlank, hasBotomBlank };
  }

  private markForReadIfNeeded() {
    if (!this.chatTab.hasUnread) return;

    const scrollPosition = this.getScrollPosition();
    if (scrollPosition.scrollHeight <= scrollPosition.bottom + 100) {
      setZeroTimeout(() => {
        this.chatTab.markForRead();
        this.changeDetector.markForCheck();
        this.changeDetector.markForCheck();
      });
    }
  }

  private onScroll() {
    this.scrollEventShortTimer.reset();
    if (!this.scrollEventLongTimer.isActive) {
      this.scrollEventLongTimer.reset();
    }
  }

  private lazyScrollUpdate(isNormalUpdate: boolean = true) {
    this.scrollEventShortTimer.stop();
    this.scrollEventLongTimer.stop();

    const chatMessageElements = this.messageContainerRef.nativeElement.querySelectorAll<HTMLElement>('chat-message');

    const messageBoxTop = this.messageContainerRef.nativeElement.offsetTop;
    const messageBoxBottom = messageBoxTop + this.messageContainerRef.nativeElement.clientHeight;

    const preTopIndex = this.topIndex;
    const preBottomIndex = this.bottomIndex;

    const scrollPosition = this.getScrollPosition();
    this.scrollSpeed = scrollPosition.top - this.preScrollTop;
    this.preScrollTop = scrollPosition.top;

    const hasTopBlank = scrollPosition.top < messageBoxTop;
    const hasBotomBlank =
      messageBoxBottom < scrollPosition.bottom && scrollPosition.bottom < scrollPosition.scrollHeight;

    if (!isNormalUpdate) {
      this.scrollEventShortTimer.reset();
    }

    if (!isNormalUpdate && !hasTopBlank && !hasBotomBlank) {
      return;
    }

    const scrollWideTop = scrollPosition.top - (!isNormalUpdate && hasTopBlank ? 100 : 1200);
    const scrollWideBottom = scrollPosition.bottom + (!isNormalUpdate && hasBotomBlank ? 100 : 1200);

    this.markForReadIfNeeded();
    this.calcItemIndexRange(
      messageBoxTop,
      messageBoxBottom,
      scrollWideTop,
      scrollWideBottom,
      scrollPosition,
      chatMessageElements
    );

    const isChangedIndex = this.topIndex != preTopIndex || this.bottomIndex != preBottomIndex;
    if (!isChangedIndex) return;

    this.needUpdate = true;

    this.topElm = chatMessageElements[0];
    this.bottomElm = chatMessageElements[chatMessageElements.length - 1];
    this.topElmBox = this.topElm.getBoundingClientRect();
    this.bottomElmBox = this.bottomElm.getBoundingClientRect();

    setZeroTimeout(() => {
      const scrollPosition = this.getScrollPosition();
      this.scrollSpeed = scrollPosition.top - this.preScrollTop;
      this.preScrollTop = scrollPosition.top;
      this.changeDetector.markForCheck();
      this.changeDetector.markForCheck();
    });
  }

  redraw() {
    // 強制的に再描画させる
    this.changeDetector.detectChanges();
  }

  private calcElementMaxHeight(chatMessageElements: NodeListOf<HTMLElement>): number {
    let maxHeight = this.minMessageHeight;
    for (let i = chatMessageElements.length - 1; 0 <= i; i--) {
      const height = chatMessageElements[i].clientHeight;
      if (maxHeight < height) maxHeight = height;
    }
    return maxHeight;
  }

  private calcItemIndexRange(
    messageBoxTop: number,
    messageBoxBottom: number,
    scrollWideTop: number,
    scrollWideBottom: number,
    scrollPosition: ScrollPosition,
    chatMessageElements: NodeListOf<HTMLElement>
  ) {
    if (scrollWideTop >= messageBoxBottom || messageBoxTop >= scrollWideBottom) {
      const lastIndex = this.chatTab.chatMessages.length - 1;
      const scrollBottomHeight = scrollPosition.scrollHeight - scrollPosition.top - scrollPosition.clientHeight;

      this.bottomIndex = lastIndex - Math.floor(scrollBottomHeight / this.minMessageHeight);
      this.topIndex = this.bottomIndex - Math.floor(scrollPosition.clientHeight / this.minMessageHeight);

      this.bottomIndex += 1;
      this.topIndex -= 1;
    } else {
      const maxHeight = this.calcElementMaxHeight(chatMessageElements);
      if (scrollWideTop < messageBoxTop) {
        this.topIndex -= Math.floor((messageBoxTop - scrollWideTop) / maxHeight) + 1;
      } else if (scrollWideTop > messageBoxTop) {
        if (!isiOS) this.topIndex += Math.floor((scrollWideTop - messageBoxTop) / maxHeight);
      }

      if (messageBoxBottom > scrollWideBottom) {
        if (!isiOS) this.bottomIndex -= Math.floor((messageBoxBottom - scrollWideBottom) / maxHeight);
      } else if (messageBoxBottom < scrollWideBottom) {
        this.bottomIndex += Math.floor((scrollWideBottom - messageBoxBottom) / maxHeight) + 1;
      }
    }
    this.adjustIndex();
  }
}
