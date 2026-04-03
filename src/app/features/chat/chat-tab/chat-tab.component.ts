import {
  afterEveryRender,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';
import { setZeroTimeout } from '@axe/core/util/zero-timeout';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatMessageComponent } from '@axe/features/chat/chat-message/chat-message.component';
import { SAMPLE_CHAT_MESSAGES } from '@axe/features/chat/chat-tab/chat-tab-sample-messages';
import {
  calcIndexRange,
  calcMaxElementHeight,
  findDisplayableTopIndex,
  getBoundedScrollPosition,
  ScrollPosition,
} from '@axe/features/chat/chat-tab/chat-tab-scroll-helpers';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

const ua = window.navigator.userAgent.toLowerCase();
const isiOS = ua.includes('iphone') || ua.includes('ipad') || (ua.includes('macintosh') && 'ontouchend' in document);

@Component({
  selector: 'chat-tab',
  templateUrl: './chat-tab.component.html',
  styleUrls: ['./chat-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatMessageComponent],
})
export class ChatTabComponent {
  private renderVersion = signal(0);
  private destroyRef = inject(DestroyRef);
  private objectChange = inject(ObjectChangeService);
  private panelService = inject(PanelService);
  private objectStore = inject(ObjectStore);
  private uiSignalService = inject(UiSignalService);

  constructor() {
    effect(() => {
      this.uiSignalService.chatRedrawVersion();
      setZeroTimeout(() => this.redraw());
    });
    effect(() => {
      this.chatTabInput();
      if (this.panelService?.scrollablePanel) {
        this.resetMessages();
      } else {
        queueMicrotask(() => this.resetMessages());
      }
    });
    afterEveryRender(() => {
      if (!this.topElm || !this.bottomElm) return;
      queueMicrotask(() => this.adjustScrollPosition());
    });
    // initialize sampleMessages
    const messages: ChatMessage[] = [];
    for (const context of this.rawSampleMessages) {
      const message = new ChatMessage();
      const ctx = context as Record<string, string | number | undefined>;
      for (const key of Object.keys(context)) {
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
    this.objectChange.messageAdded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      const message = this.objectStore.get<ChatMessage>(event.messageIdentifier);
      if (!message || !this.chatTab?.contains(message)) return;
      if (this.topTimestamp <= message.timestamp) {
        // bottomIndex がリスト末尾にある場合は新着メッセージを含むよう即座に拡張する。
        // scrollToBottom() の isAutoScroll タイミング競合に依存せず確実に表示する。
        const newLastIndex = this.chatTab.chatMessages.length - 1;
        if (this.bottomIndex >= newLastIndex - 1) {
          this.bottomIndex = newLastIndex;
        }
        this.renderVersion.update((v) => v + 1);
        this.needUpdate = true;
        this.onMessageInit();
      }
    });
    this.objectChange.objectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      const message = this.objectStore.get(event.identifier);
      if (
        message &&
        message instanceof ChatMessage &&
        this.topTimestamp <= message.timestamp &&
        message.timestamp <= this.botomTimestamp &&
        this.chatTab?.contains(message)
      ) {
        this.renderVersion.update((v) => v + 1);
      }
    });
    afterNextRender(() => {
      this.scrollEventShortTimer = new ResettableTimeout(() => this.lazyScrollUpdate(), 33);
      this.scrollEventLongTimer = new ResettableTimeout(() => this.lazyScrollUpdate(false), 66);
      this.onScroll();
      this.panelService.scrollablePanel!.addEventListener('scroll', this.callbackOnScroll, false);
      this.panelService.scrollablePanel!.addEventListener('scrolltobottom', this.callbackOnScrollToBottom, false);
    });
    this.destroyRef.onDestroy(() => {
      if (this.panelService.scrollablePanel) {
        this.panelService.scrollablePanel.removeEventListener('scroll', this.callbackOnScroll, false);
        this.panelService.scrollablePanel.removeEventListener('scrolltobottom', this.callbackOnScrollToBottom, false);
      }
      if (this.scrollEventShortTimer) this.scrollEventShortTimer.clear();
      if (this.scrollEventLongTimer) this.scrollEventLongTimer.clear();
      if (this.addMessageEventTimer) clearTimeout(this.addMessageEventTimer);
      this.addMessageEventTimer = null;
    });
  }

  private readonly rawSampleMessages = SAMPLE_CHAT_MESSAGES;
  sampleMessages: ChatMessage[] = [];

  private topTimestamp = 0;
  private botomTimestamp = 0;

  private needUpdate = true;

  readonly logContainerRef = viewChild.required<ElementRef<HTMLDivElement>>('logContainer');
  readonly messageContainerRef = viewChild.required<ElementRef<HTMLDivElement>>('messageContainer');

  private topElm: HTMLElement | null = null;
  private bottomElm: HTMLElement | null = null;
  private topElmBox: ClientRect | null = null;
  private bottomElmBox: ClientRect | null = null;
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
    this.renderVersion();
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

  get minScrollHeight(): number {
    //    let length = this.chatTab ? this.chatTab.chatMessages.length : this.sampleMessages.length;
    const length = this.chatTab ? this.chatTab.displayableMessagesLength() : this.sampleMessages.length;
    return (length < 10000 ? length : 10000) * this.minMessageHeight;
  }

  get topSpace(): number {
    return this.minScrollHeight - this.bottomSpace;
  }
  get bottomSpace(): number {
    const tab = this.chatTab;
    return 0 < this.chatMessages.length
      ? ((tab?.chatMessages.length ?? 0) - this.bottomIndex - 1) * this.minMessageHeight
      : 0;
  }

  private scrollEventShortTimer: ResettableTimeout | null = null;
  private scrollEventLongTimer: ResettableTimeout | null = null;
  private addMessageEventTimer: NodeJS.Timeout | null = null;
  private callbackOnScroll: () => void = () => this.onScroll();
  private callbackOnScrollToBottom: () => void = () => this.resetMessages();

  readonly chatTabInput = input<ChatTab | null>(null, { alias: 'chatTab' });
  get chatTab(): ChatTab | null {
    return this.chatTabInput();
  }
  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  readonly addMessage = output<void>();

  onMessageInit() {
    if (this.addMessageEventTimer != null) return;
    this.addMessageEventTimer = setTimeout(() => {
      this.addMessageEventTimer = null;
      this.addMessage.emit();
    }, 0);
  }

  resetMessages() {
    if (!this.chatTab || !this.panelService?.scrollablePanel) return;
    const lastIndex = this.chatTab.chatMessages.length - 1;
    //    this.topIndex = lastIndex - Math.floor(this.panelService.scrollablePanel.clientHeight / this.minMessageHeight);
    this.topIndex = findDisplayableTopIndex(
      this.chatTab.chatMessages,
      Math.floor(this.panelService.scrollablePanel.clientHeight / this.minMessageHeight) + 1
    );
    this.bottomIndex = lastIndex;
    this.needUpdate = true;
    this.preScrollTop = -1;
    this.scrollSpeed = 0;
    this.topElm = this.bottomElm = null;
    this.adjustIndex();
    this.renderVersion.update((v) => v + 1);
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
    return getBoundedScrollPosition(this.panelService.scrollablePanel!);
  }

  private adjustScrollPosition() {
    if (!this.topElm || !this.bottomElm) return;

    const hasTopElm = this.logContainerRef().nativeElement.contains(this.topElm);
    const hasBotomElm = this.logContainerRef().nativeElement.contains(this.bottomElm);

    const { hasTopBlank, hasBotomBlank } = this.checkBlank(hasTopElm, hasBotomElm);

    this.topElm = this.bottomElm = null;

    if (hasTopBlank || hasBotomBlank || (!hasTopElm && !hasBotomElm)) {
      setZeroTimeout(() => this.lazyScrollUpdate());
    }
  }
  private checkBlank(hasTopElm: boolean, hasBotomElm: boolean) {
    let hasTopBlank = !hasTopElm;
    let hasBotomBlank = !hasBotomElm;

    if (!hasTopElm && !hasBotomElm) return { hasTopBlank, hasBotomBlank };

    let elm: HTMLElement | null = null;
    let prevBox: ClientRect | null = null;
    if (hasBotomElm) {
      elm = this.bottomElm;
      prevBox = this.bottomElmBox;
    } else if (hasTopElm) {
      elm = this.topElm;
      prevBox = this.topElmBox;
    }
    const currentBox = elm!.getBoundingClientRect();
    const diff = (prevBox?.top ?? 0) - currentBox.top - this.scrollSpeed;
    if ((!hasTopBlank || !hasBotomBlank) && 0.5 ** 2 < diff ** 2) {
      this.panelService.scrollablePanel!.scrollTop -= diff;
    }

    const logBox: ClientRect = this.logContainerRef().nativeElement.getBoundingClientRect();
    const messageBox: ClientRect = this.messageContainerRef().nativeElement.getBoundingClientRect();

    const messageBoxTop = messageBox.top - logBox.top;
    const messageBoxBottom = messageBoxTop + messageBox.height;

    const scrollPosition = this.getScrollPosition();

    hasTopBlank = scrollPosition.top < messageBoxTop;
    hasBotomBlank = messageBoxBottom < scrollPosition.bottom && scrollPosition.bottom < scrollPosition.scrollHeight;

    return { hasTopBlank, hasBotomBlank };
  }

  private markForReadIfNeeded() {
    const tab = this.chatTab;
    if (!tab?.hasUnread) return;

    const scrollPosition = this.getScrollPosition();
    if (scrollPosition.scrollHeight <= scrollPosition.bottom + 100) {
      setZeroTimeout(() => {
        this.chatTab?.markForRead();
        this.renderVersion.update((v) => v + 1);
      });
    }
  }

  private onScroll() {
    this.scrollEventShortTimer?.reset();
    if (!this.scrollEventLongTimer?.isActive) {
      this.scrollEventLongTimer?.reset();
    }
  }

  private lazyScrollUpdate(isNormalUpdate: boolean = true) {
    this.scrollEventShortTimer?.stop();
    this.scrollEventLongTimer?.stop();

    const chatMessageElements = this.messageContainerRef().nativeElement.querySelectorAll<HTMLElement>('chat-message');

    const messageBoxTop = this.messageContainerRef().nativeElement.offsetTop;
    const messageBoxBottom = messageBoxTop + this.messageContainerRef().nativeElement.clientHeight;

    const preTopIndex = this.topIndex;
    const preBottomIndex = this.bottomIndex;

    const scrollPosition = this.getScrollPosition();
    this.scrollSpeed = scrollPosition.top - this.preScrollTop;
    this.preScrollTop = scrollPosition.top;

    const hasTopBlank = scrollPosition.top < messageBoxTop;
    const hasBotomBlank =
      messageBoxBottom < scrollPosition.bottom && scrollPosition.bottom < scrollPosition.scrollHeight;

    if (!isNormalUpdate) {
      this.scrollEventShortTimer?.reset();
    }

    if (!isNormalUpdate && !hasTopBlank && !hasBotomBlank) {
      return;
    }

    const scrollWideTop = scrollPosition.top - (!isNormalUpdate && hasTopBlank ? 100 : 1200);
    const scrollWideBottom = scrollPosition.bottom + (!isNormalUpdate && hasBotomBlank ? 100 : 1200);

    this.markForReadIfNeeded();
    const maxHeight = calcMaxElementHeight(chatMessageElements, this.minMessageHeight);
    const range = calcIndexRange({
      topIndex: this.topIndex,
      bottomIndex: this.bottomIndex,
      chatMessagesLength: this.chatTab?.chatMessages.length ?? 0,
      minMessageHeight: this.minMessageHeight,
      maxHeight,
      messageBoxTop,
      messageBoxBottom,
      scrollWideTop,
      scrollWideBottom,
      scrollPosition,
      isIOS: isiOS,
    });
    this.topIndex = range.topIndex;
    this.bottomIndex = range.bottomIndex;

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
      this.renderVersion.update((v) => v + 1);
    });
  }

  redraw() {
    // 強制的に再描画させる
    this.renderVersion.update((v) => v + 1);
  }
}
