import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage, ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatInputComponent } from '@axe/features/chat/chat-input/chat-input.component';
import { ChatMessageSettingComponent } from '@axe/features/chat/chat-message-setting/chat-message-setting.component';
import { ChatPortraitComponent } from '@axe/features/chat/chat-portrait/chat-portrait.component';
import { ChatTabComponent } from '@axe/features/chat/chat-tab/chat-tab.component';
import { ChatTabSettingComponent } from '@axe/features/chat/chat-tab-setting/chat-tab-setting.component';
import { BadgeComponent } from '@axe/ui/components/badge/badge.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';
import GameSystemClass from 'bcdice/lib/game_system';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-window',
  templateUrl: './chat-window.component.html',
  imports: [
    ChatTabComponent,
    FormsModule,
    ChatPortraitComponent,
    BadgeComponent,
    ChatInputComponent,
    SafePipe,
    TranslocoModule,
  ],
})
export class ChatWindowComponent {
  chatMessageService = inject(ChatMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly t = inject(TRANSLATE_FN);

  sendFrom: string = 'Guest';

  get gameType(): string {
    return !this.chatMessageService.gameType ? 'DiceBot' : this.chatMessageService.gameType;
  }
  set gameType(gameType: string) {
    this.chatMessageService.gameType = gameType;
  }

  private readonly _chatTabidentifier = signal('');
  get chatTabidentifier(): string {
    return this._chatTabidentifier();
  }
  set chatTabidentifier(chatTabidentifier: string) {
    const hasChanged: boolean = this._chatTabidentifier() !== chatTabidentifier;
    this._chatTabidentifier.set(chatTabidentifier);
    this.updatePanelTitle();
    if (hasChanged) {
      this.scrollToBottom(true);
      queueMicrotask(() => this.scrollActiveTabIntoView());
    }
  }

  private readonly tabPillsContainer = viewChild<ElementRef<HTMLElement>>('tabPillsContainer');
  readonly chatTabRef = viewChild(ChatTabComponent);
  readonly canScrollLeft = signal(false);
  readonly canScrollRight = signal(false);

  updateTabScrollState(): void {
    const el = this.tabPillsContainer()?.nativeElement;
    if (!el) return;
    this.canScrollLeft.set(el.scrollLeft > 0);
    this.canScrollRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  onTabPillsScroll(): void {
    this.updateTabScrollState();
  }

  scrollTabsLeft(): void {
    const el = this.tabPillsContainer()?.nativeElement;
    if (el) el.scrollBy({ left: -120, behavior: 'smooth' });
  }

  scrollTabsRight(): void {
    const el = this.tabPillsContainer()?.nativeElement;
    if (el) el.scrollBy({ left: 120, behavior: 'smooth' });
  }

  private scrollActiveTabIntoView(): void {
    const el = this.tabPillsContainer()?.nativeElement;
    if (!el) return;
    const activeInput = el.querySelector<HTMLInputElement>('input[type="radio"]:checked');
    if (activeInput?.parentElement) {
      activeInput.parentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    this.updateTabScrollState();
  }

  chatTabSwitchRelative(direction: number) {
    const chatTabs = this.chatMessageService.chatTabs;
    const index = chatTabs.findIndex((elm) => elm.identifier == this.chatTabidentifier);
    if (index < 0) {
      return;
    }

    let nextIndex: number;
    if (index == chatTabs.length - 1 && direction == 1) {
      nextIndex = 0;
    } else if (index == 0 && direction == -1) {
      nextIndex = chatTabs.length - 1;
    } else {
      nextIndex = index + direction;
    }
    this.chatTabidentifier = chatTabs[nextIndex].identifier;
  }

  readonly chatTab = computed(() => {
    this.objectChange.versionOf(this.chatTabidentifier)();
    this.objectChange.collectionOf('chat-tab')();
    return this.objectStore.get<ChatTab>(this.chatTabidentifier) ?? null;
  });

  readonly chatTabsVersion = computed(() => {
    this.objectChange.collectionOf('chat-tab')();
    this.objectChange.versionOf(ChatTabList.instance.identifier)();
    const tabs = this.chatMessageService.chatTabs;
    for (const tab of tabs) this.objectChange.versionOf(tab.identifier)();
    return [...tabs];
  });

  private isAutoScroll = true;
  readonly hasNewMessage = signal(false);
  readonly isNearBottom = signal(true);
  private scrollToBottomTimer: NodeJS.Timeout | null = null;
  private scrollListener: (() => void) | null = null;

  constructor() {
    this.sendFrom = PeerCursor.myCursor.identifier;
    this._chatTabidentifier.set(
      0 < this.chatMessageService.chatTabs.length ? this.chatMessageService.chatTabs[0].identifier : ''
    );
    this.objectChange.messageAdded$.subscribe((event) => {
      if (event.tabIdentifier !== this.chatTabidentifier) return;
      const message = this.objectStore.get<ChatMessage>(event.messageIdentifier);
      if (message && message.isSendFromSelf) {
        this.isAutoScroll = true;
        this.hasNewMessage.set(false);
      } else {
        this.checkAutoScroll();
        if (!this.isAutoScroll) {
          this.hasNewMessage.set(true);
        }
      }
      if (this.isAutoScroll) this.chatTab()?.markForRead();
    }, this.destroyRef);
    this.objectChange.writingMessage$.subscribe((event) => {
      if (event.isSendFromSelf || event.tabIdentifier !== this.chatTabidentifier) return;
      if (!this.isNearBottom()) return;
      setTimeout(() => {
        const panel = this.panelService.scrollablePanel;
        if (!panel) return;
        panel.scrollTop = panel.scrollHeight;
      }, 0);
    }, this.destroyRef);
    this.objectChange.onObjectChangedForAlias(
      [ChatTab.aliasName, ChatTabList.aliasName],
      (event) => {
        const object = this.objectStore.get(event.identifier);
        if (object instanceof ChatTab || object instanceof ChatTabList) {
          if (!this.objectStore.get<ChatTab>(this._chatTabidentifier())) {
            const chatTabs = this.chatMessageService.chatTabs;
            this.chatTabidentifier = chatTabs.length > 0 ? chatTabs[0].identifier : '';
          }
        }
      },
      this.destroyRef
    );
    this.objectChange.objectDeleted$.subscribe((event) => {
      if (event.aliasName !== 'chat-tab') return;
      if (this._chatTabidentifier() === event.identifier) {
        const chatTabs = this.chatMessageService.chatTabs;
        this.chatTabidentifier = chatTabs.length > 0 ? chatTabs[0].identifier : '';
      }
    }, this.destroyRef);
    queueMicrotask(() => this.updatePanelTitle());
    effect(() => {
      const tab = this.chatTab();
      if (!tab) {
        const chatTabs = this.chatMessageService.chatTabs;
        if (chatTabs.length > 0) {
          this.chatTabidentifier = chatTabs[0].identifier;
        }
      }
    });
    effect(() => {
      this.chatTabsVersion();
      queueMicrotask(() => this.updateTabScrollState());
    });
    afterNextRender(() => {
      queueMicrotask(() => this.scrollToBottom(true));
      queueMicrotask(() => this.updateTabScrollState());
      if (this.panelService.scrollablePanel) {
        this.scrollListener = () => this.onScrollPositionChange();
        this.panelService.scrollablePanel.addEventListener('scroll', this.scrollListener, { passive: true });
      }
    });
    this.destroyRef.onDestroy(() => {
      if (this.scrollListener && this.panelService.scrollablePanel) {
        this.panelService.scrollablePanel.removeEventListener('scroll', this.scrollListener);
      }
    });
  }

  private onScrollPositionChange() {
    if (!this.panelService.scrollablePanel) return;
    const panel = this.panelService.scrollablePanel;
    const distanceFromBottom = panel.scrollHeight - panel.clientHeight - panel.scrollTop;
    const nearBottom = distanceFromBottom <= 350;
    this.isNearBottom.set(nearBottom);
    if (nearBottom) {
      this.hasNewMessage.set(false);
    }
  }

  onClickScrollToBottom() {
    this.hasNewMessage.set(false);
    this.scrollToBottom(true);
  }

  scrollToBottom(isForce: boolean = false) {
    if (isForce) this.isAutoScroll = true;
    if (!this.isAutoScroll) return;
    if (!this.panelService.scrollablePanel) return;
    this.panelService.scrollToBottom$.emit();
    if (this.scrollToBottomTimer != null) return;
    this.scrollToBottomTimer = setTimeout(() => {
      this.chatTab()?.markForRead();
      this.objectChange.notifyChanged(this.chatTabidentifier);
      this.scrollToBottomTimer = null;
      this.isAutoScroll = false;
      if (this.panelService.scrollablePanel) {
        this.panelService.scrollablePanel.scrollTop = this.panelService.scrollablePanel.scrollHeight;
      }
    }, 0);
  }

  checkAutoScroll() {
    if (!this.panelService.scrollablePanel) return;
    const distanceFromBottom =
      this.panelService.scrollablePanel.scrollHeight -
      this.panelService.scrollablePanel.clientHeight -
      this.panelService.scrollablePanel.scrollTop;
    this.isAutoScroll = distanceFromBottom <= 350;
  }

  updatePanelTitle() {
    const tab = this.chatTab();
    if (tab) {
      this.panelService.title = this.t('feature.chat.window.titleWithTab', { tab: tab.name });
      this.panelService.chatTab = tab;
    } else {
      this.panelService.title = this.t('common.panel.chatWindow');
      this.panelService.chatTab = null;
    }
  }

  onSelectedTab(_identifier: string) {
    this.updatePanelTitle();
  }

  showTabSetting() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      title: this.t('feature.chat.window.tabSettingTitle'),
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 500,
      height: 380,
    };
    const component = this.panelService.open<ChatTabSettingComponent>(ChatTabSettingComponent, option);
    component.selectedTab.set(this.chatTab());
  }

  showDiceTableSetting() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      title: this.t('feature.chat.window.diceTableSetting'),
      left: coordinate.x + 50,
      top: coordinate.y - 450,
      width: 650,
      height: 400,
    };
    this.panelService.openLazy(
      () =>
        import('@axe/features/dice/dice-table-setting/dice-table-setting.component').then(
          (m) => m.DiceTableSettingComponent
        ),
      option
    );
  }

  showChatSetting() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      title: this.t('feature.chat.window.chatSetting'),
      left: coordinate.x + 50,
      top: coordinate.y - 300,
      width: 340,
      height: 320,
    };
    const component = this.panelService.open<ChatMessageSettingComponent>(ChatMessageSettingComponent, option);
    component.chatTabidentifier = this.chatTabidentifier;
  }

  showVoteMenu() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      title: this.t('feature.chat.window.voteMenuTitle'),
      left: coordinate.x + 50,
      top: coordinate.y - 450,
      width: 650,
      height: 400,
    };
    this.panelService.openLazy(
      () => import('@axe/features/vote/vote-menu/vote-menu.component').then((m) => m.VoteMenuComponent),
      option
    );
  }

  showAlarmMenu() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      title: this.t('feature.chat.window.alarmMenuTitle'),
      left: coordinate.x + 50,
      top: coordinate.y - 450,
      width: 650,
      height: 400,
    };
    this.panelService.openLazy(
      () => import('@axe/features/alarm/alarm-menu/alarm-menu.component').then((m) => m.AlarmMenuComponent),
      option
    );
  }

  checkTargetCharacter(text: string): boolean {
    let istarget = false;
    if (text.match(/^[sSｓＳ]?[tTｔＴ][:：]([^:：]+)/g)) {
      istarget = true;
    }
    if (text.match(/\s[sSｓＳ]?[tTｔＴ][:：]([^:：]+)/g)) {
      istarget = true;
    }
    if (text.match(/^[tTｔＴ][&＆]([^&＆]+)/g)) {
      istarget = true;
    }
    if (text.match(/\s[tTｔＴ][&＆]([^&＆]+)/g)) {
      istarget = true;
    }
    return istarget;
  }

  private targeted(gameCharacter: GameCharacter): boolean {
    if (gameCharacter.location.name != 'table') return false;
    return gameCharacter.targeted;
  }

  private targetedGameCharacterList(): GameCharacter[] {
    const objects = this.objectStore
      .getObjects<GameCharacter>(GameCharacter)
      .filter((character) => this.targeted(character));
    return objects;
  }

  sendChat(value: {
    text: string;
    gameSystem: GameSystemClass;
    sendFrom: string;
    sendTo: string;
    portraitIndex: number;
    messColor: string;
    replyTo: string;
    quoteOf: string;
  }) {
    const tab = this.chatTab();
    if (tab) {
      let outtext = '';
      let objects: GameCharacter[];
      const messageTargetContext: ChatMessageTargetContext[] = [];

      if (this.checkTargetCharacter(value.text)) {
        objects = this.targetedGameCharacterList();
        let first = true;
        if (objects.length == 0) {
          outtext += this.t('feature.chat.window.noTarget');
        }
        for (const object of objects) {
          outtext += first ? '' : '\n';
          const str = value.text;
          let str2: string;
          if (first) {
            str2 = str;
          } else {
            str2 = DiceBot.deleteMyselfResourceBuff(str);
          }

          outtext += str2;
          outtext += ' [' + object.name + ']';
          first = false;

          const targetContext: ChatMessageTargetContext = {
            text: '',
            object: null,
          };
          targetContext.text = str2;
          targetContext.object = object;
          messageTargetContext.push(targetContext);
        }
      } else {
        outtext = value.text;
        const targetContext: ChatMessageTargetContext = {
          text: '',
          object: null,
        };
        targetContext.text = value.text;
        targetContext.object = null;
        messageTargetContext.push(targetContext);
      }
      this.chatMessageService.sendMessage(
        tab,
        outtext,
        value.gameSystem,
        value.sendFrom,
        value.sendTo,
        value.portraitIndex,
        value.messColor,
        messageTargetContext,
        undefined,
        value.replyTo,
        value.quoteOf
      );
    }
  }

  trackByChatTab(index: number, chatTab: ChatTab) {
    return chatTab.identifier;
  }
}
