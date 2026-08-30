import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { LanguageService } from '@axe/application/i18n/language.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { canRoleViewTab } from '@axe/domain/chat/chat-tab-permission';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { parseVnEmote } from '@axe/features/visual-novel/visual-novel-emote';
import { readableMessageText } from '@axe/features/visual-novel/visual-novel-message';
import {
  VisualNovelSettingsService,
  VN_TYPEWRITER_INTERVAL_MS,
} from '@axe/features/visual-novel/visual-novel-settings.service';
import { toGraphemes } from '@axe/features/visual-novel/visual-novel-text';

const AUTO_PLAY_BASE_WAIT_MS = 1200;
const AUTO_PLAY_PER_CHAR_MS = 35;
const AUTO_PLAY_MAX_WAIT_MS = 4000;
const SKIP_INTERVAL_MS = 120;

@Injectable({ providedIn: 'root' })
export class VisualNovelPlaybackService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly settings = inject(VisualNovelSettingsService);
  private readonly translate = inject(TRANSLATE_FN);
  private readonly language = inject(LanguageService);

  private readonly renderVersion = signal(0);
  private readonly cursor = signal(-1);
  private readonly typedLength = signal(0);
  private readonly attached = signal(false);
  private readonly _chatTabIdentifier = signal('');

  private typingTimer: ReturnType<typeof setInterval> | null = null;
  private autoPlayTimer: ReturnType<typeof setTimeout> | null = null;
  private skipTimer: ReturnType<typeof setInterval> | null = null;
  private revealInstantly = false;

  readonly autoPlay = signal(false);
  readonly isSkipping = signal(false);

  readonly chatTabIdentifier = this._chatTabIdentifier.asReadonly();

  readonly chatTab = computed(() => {
    this.objectChange.collectionOf(ChatTab.aliasName)();
    this.objectChange.versionOf(this._chatTabIdentifier())();
    return this.objectStore.get<ChatTab>(this._chatTabIdentifier()) ?? null;
  });

  readonly messages = computed(() => {
    this.renderVersion();
    const tab = this.chatTab();
    if (!tab) return [] as ChatMessage[];
    return tab.chatMessages.filter((message) => message.isDisplayable);
  });

  readonly currentIndex = computed(() => {
    const length = this.messages().length;
    if (length < 1) return -1;
    const cursor = this.cursor();
    if (cursor < 0) return length - 1;
    return Math.min(cursor, length - 1);
  });

  readonly currentMessage = computed(() => this.messages()[this.currentIndex()] ?? null);

  readonly isLatest = computed(() => this.currentIndex() >= this.messages().length - 1);

  readonly currentEmote = computed(() => {
    this.renderVersion();
    this.language.currentLang();
    return parseVnEmote(readableMessageText(this.currentMessage(), this.translate));
  });

  readonly currentFullText = computed(() => this.currentEmote().text);

  private readonly currentGraphemes = computed(() => toGraphemes(this.currentFullText()));

  readonly displayedText = computed(() => this.currentGraphemes().slice(0, this.typedLength()).join(''));

  readonly isTyping = computed(() => this.typedLength() < this.currentGraphemes().length);

  readonly currentIsDiceCommand = computed(() => this.isDiceCommandAt(this.currentIndex()));

  readonly availableChatTabs = computed(() => {
    this.objectChange.collectionOf(ChatTab.aliasName)();
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    const role = PeerCursor.myRole;
    return this.chatMessageService.chatTabs.filter((tab) => canRoleViewTab(tab, role));
  });

  constructor() {
    this._chatTabIdentifier.set(this.initialChatTabIdentifier());

    this.objectChange.messageAdded$.subscribe(() => {
      this.renderVersion.update((version) => version + 1);
    }, this.destroyRef);
    this.objectChange.onObjectChangedForAlias(
      [ChatMessage.aliasName],
      () => this.renderVersion.update((version) => version + 1),
      this.destroyRef
    );
    this.objectChange.onObjectChangedForAlias(
      [ChatTab.aliasName, ChatTabList.aliasName],
      () => {
        if (this.objectStore.get<ChatTab>(this._chatTabIdentifier())) return;
        const chatTabs = this.chatMessageService.chatTabs;
        this._chatTabIdentifier.set(chatTabs.length > 0 ? chatTabs[0].identifier : '');
      },
      this.destroyRef
    );

    effect(() => {
      const message = this.currentMessage();
      const attached = this.attached();
      untracked(() => (attached ? this.restartTypewriter(message) : this.stopTypewriter()));
    });

    effect(() => {
      const active = this.autoPlay() && this.attached();
      const typing = this.isTyping();
      const index = this.currentIndex();
      untracked(() => {
        this.clearAutoPlayTimer();
        if (!active || typing) return;
        if (index < 0 || index >= this.messages().length - 1) {
          this.autoPlay.set(false);
          return;
        }
        const wait =
          Math.min(
            AUTO_PLAY_MAX_WAIT_MS,
            AUTO_PLAY_BASE_WAIT_MS + this.currentFullText().length * AUTO_PLAY_PER_CHAR_MS
          ) / this.settings.autoPlaySpeed();
        this.autoPlayTimer = setTimeout(() => {
          this.autoPlayTimer = null;
          this.advance();
        }, wait);
      });
    });

    this.destroyRef.onDestroy(() => {
      this.stopTypewriter();
      this.stopAutoPlay();
      this.stopSkip();
    });
  }

  attach(): void {
    this.attached.set(true);
  }

  detach(): void {
    this.attached.set(false);
    this.stopAutoPlay();
    this.stopSkip();
    this.stopTypewriter();
    this.revealInstantly = false;
    this.cursor.set(-1);
  }

  setChatTab(identifier: string): void {
    this.stopAutoPlay();
    this._chatTabIdentifier.set(identifier);
    this.settings.setChatTabIdentifier(identifier);
    this.cursor.set(-1);
  }

  private initialChatTabIdentifier(): string {
    const tabs = this.chatMessageService.chatTabs;
    const saved = this.settings.chatTabIdentifier();
    if (saved.length > 0 && tabs.some((tab) => tab.identifier === saved)) return saved;
    return tabs.length > 0 ? tabs[0].identifier : '';
  }

  advance(): void {
    if (this.isTyping()) {
      this.stopTypewriter();
      this.typedLength.set(this.currentGraphemes().length);
      return;
    }
    const index = this.currentIndex();
    const lastIndex = this.messages().length - 1;
    if (index < 0 || index >= lastIndex) {
      this.cursor.set(-1);
      return;
    }
    this.cursor.set(index + 1 >= lastIndex ? -1 : index + 1);
  }

  back(): void {
    const index = this.currentIndex();
    if (index <= 0) return;
    this.revealInstantly = true;
    this.cursor.set(index - 1);
  }

  userAdvance(): void {
    this.stopAutoPlay();
    this.advance();
  }

  userBack(): void {
    this.stopAutoPlay();
    this.back();
  }

  toLatest(): void {
    this.stopAutoPlay();
    this.cursor.set(-1);
  }

  jumpTo(index: number): void {
    this.stopAutoPlay();
    const lastIndex = this.messages().length - 1;
    if (index < 0 || lastIndex < 0) return;
    this.revealInstantly = true;
    this.cursor.set(index >= lastIndex ? -1 : index);
  }

  followLatest(): void {
    this.cursor.set(-1);
  }

  jumpToIdentifier(identifier: string): void {
    if (identifier.length < 1) return;
    const messages = this.messages();
    const index = messages.findIndex((message) => message.identifier === identifier);
    if (index < 0) return;
    this.cursor.set(index >= messages.length - 1 ? -1 : index);
  }

  toggleAutoPlay(): void {
    if (this.autoPlay()) {
      this.stopAutoPlay();
      return;
    }
    if (this.isLatest()) return;
    this.revealInstantly = false;
    this.autoPlay.set(true);
  }

  playFromStart(): void {
    this.stopAutoPlay();
    if (this.messages().length < 1) return;
    this.revealInstantly = false;
    this.cursor.set(0);
    this.autoPlay.set(true);
  }

  stopAutoPlay(): void {
    this.autoPlay.set(false);
    this.clearAutoPlayTimer();
  }

  startSkip(): void {
    if (this.skipTimer != null) return;
    this.stopAutoPlay();
    this.isSkipping.set(true);
    this.skipStep();
    this.skipTimer = setInterval(() => this.skipStep(), SKIP_INTERVAL_MS);
  }

  stopSkip(): void {
    this.isSkipping.set(false);
    if (this.skipTimer == null) return;
    clearInterval(this.skipTimer);
    this.skipTimer = null;
  }

  private skipStep(): void {
    if (this.isLatest() && !this.isTyping()) {
      this.stopSkip();
      return;
    }
    this.revealInstantly = true;
    this.advance();
  }

  isDiceCommandAt(index: number): boolean {
    const messages = this.messages();
    const message = messages[index];
    const next = messages[index + 1];
    if (!message || !next) return false;
    if (message.isSystemMessage || message.isDicebot) return false;
    return next.isDicebot && next.timestamp === message.timestamp + 1 && next.originFrom === message.from;
  }

  private clearAutoPlayTimer(): void {
    if (this.autoPlayTimer == null) return;
    clearTimeout(this.autoPlayTimer);
    this.autoPlayTimer = null;
  }

  private restartTypewriter(message: ChatMessage | null): void {
    this.stopTypewriter();
    const parsed = parseVnEmote(readableMessageText(message, this.translate));
    const total = toGraphemes(parsed.text).length;
    const interval = VN_TYPEWRITER_INTERVAL_MS[this.settings.typewriterSpeed()];
    const isDiceCommand = this.currentIsDiceCommand();
    if (
      this.revealInstantly ||
      interval < 1 ||
      parsed.kind === 'location' ||
      parsed.kind === 'scene' ||
      isDiceCommand
    ) {
      this.revealInstantly = false;
      this.typedLength.set(total);
      return;
    }
    this.typedLength.set(0);
    if (total < 1) return;
    this.typingTimer = setInterval(() => {
      this.typedLength.update((length) => Math.min(total, length + 1));
      if (this.typedLength() >= total) this.stopTypewriter();
    }, interval);
  }

  private stopTypewriter(): void {
    if (this.typingTimer == null) return;
    clearInterval(this.typingTimer);
    this.typingTimer = null;
  }
}
