import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage, ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { AlarmMenuComponent } from '@axe/features/alarm/alarm-menu/alarm-menu.component';
import { ChatInputComponent } from '@axe/features/chat/chat-input/chat-input.component';
import { ChatTabComponent } from '@axe/features/chat/chat-tab/chat-tab.component';
import { ChatTabSettingComponent } from '@axe/features/chat/chat-tab-setting/chat-tab-setting.component';
import { ChatTachieComponent } from '@axe/features/chat/chat-tachie/chat-tachie.component';
import { DiceTableSettingComponent } from '@axe/features/dice/dice-table-setting/dice-table-setting.component';
import { VoteMenuComponent } from '@axe/features/vote/vote-menu/vote-menu.component';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { BadgeComponent } from '@axe/shared/components/badge/badge.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import GameSystemClass from 'bcdice/lib/game_system';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.css'],
  imports: [ChatTabComponent, FormsModule, ChatTachieComponent, BadgeComponent, ChatInputComponent],
})
export class ChatWindowComponent {
  chatMessageService = inject(ChatMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);

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
    }
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

  get chatTab(): ChatTab {
    this.objectChange.versionOf(this.chatTabidentifier)();
    this.objectChange.collectionOf('chat-tab')();
    return this.objectStore.get<ChatTab>(this.chatTabidentifier)!;
  }
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
      if (this.isAutoScroll && this.chatTab) this.chatTab.markForRead();
    }, this.destroyRef);
    this.objectChange.objectChanged$.subscribe((event) => {
      const object = this.objectStore.get(event.identifier);
      if (object instanceof ChatTab || object instanceof ChatTabList) {
        if (this._chatTabidentifier() && !this.objectStore.get<ChatTab>(this._chatTabidentifier())) {
          const chatTabs = this.chatMessageService.chatTabs;
          this.chatTabidentifier = chatTabs.length > 0 ? chatTabs[0].identifier : '';
        }
      }
    }, this.destroyRef);
    this.objectChange.objectDeleted$.subscribe((event) => {
      if (event.aliasName !== 'chat-tab') return;
      if (this._chatTabidentifier() === event.identifier) {
        const chatTabs = this.chatMessageService.chatTabs;
        this.chatTabidentifier = chatTabs.length > 0 ? chatTabs[0].identifier : '';
      }
    }, this.destroyRef);
    queueMicrotask(() => this.updatePanelTitle());
    afterNextRender(() => {
      queueMicrotask(() => this.scrollToBottom(true));
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

  // @TODO やり方はもう少し考えた方がいいい
  scrollToBottom(isForce: boolean = false) {
    if (isForce) this.isAutoScroll = true;
    if (!this.isAutoScroll) return;
    if (!this.panelService.scrollablePanel) return;
    const event = new CustomEvent('scrolltobottom', {});
    this.panelService.scrollablePanel.dispatchEvent(event);
    if (this.scrollToBottomTimer != null) return;
    this.scrollToBottomTimer = setTimeout(() => {
      if (this.chatTab) this.chatTab.markForRead();
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
    if (this.chatTab) {
      this.panelService.title = 'チャットウィンドウ - ' + this.chatTab.name;
      this.panelService.chatTab = this.chatTab;
    } else {
      this.panelService.title = 'チャットウィンドウ';
      this.panelService.chatTab = null;
    }
  }

  onSelectedTab(_identifier: string) {
    this.updatePanelTitle();
  }

  showTabSetting() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x - 250, top: coordinate.y - 175, width: 500, height: 380 };
    const component = this.panelService.open<ChatTabSettingComponent>(ChatTabSettingComponent, option);
    component.selectedTab.set(this.chatTab);
  }

  showDiceTableSetting() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x + 50, top: coordinate.y - 450, width: 650, height: 400 };
    this.panelService.open<DiceTableSettingComponent>(DiceTableSettingComponent, option);
  }

  showVoteMenu() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x + 50, top: coordinate.y - 450, width: 650, height: 400 };
    this.panelService.open<VoteMenuComponent>(VoteMenuComponent, option);
  }

  showAlarmMenu() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x + 50, top: coordinate.y - 450, width: 650, height: 400 };
    this.panelService.open<AlarmMenuComponent>(AlarmMenuComponent, option);
  }

  checkTargetCharactor(text: string): boolean {
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
    tachieNum: number;
    messColor: string;
  }) {
    if (this.chatTab) {
      let outtext = '';
      let objects: GameCharacter[];
      const messageTargetContext: ChatMessageTargetContext[] = [];

      if (this.checkTargetCharactor(value.text)) {
        objects = this.targetedGameCharacterList();
        let first = true;
        if (objects.length == 0) {
          outtext += '対象が未選択です';
        }
        for (const object of objects) {
          outtext += first ? '' : '\n';
          const str = value.text;
          let str2: string;
          if (first) {
            str2 = str;
          } else {
            //自分リソース操作指定の省略
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
        this.chatTab,
        outtext,
        value.gameSystem,
        value.sendFrom,
        value.sendTo,
        value.tachieNum,
        value.messColor,
        messageTargetContext
      );
    }
  }

  trackByChatTab(index: number, chatTab: ChatTab) {
    return chatTab.identifier;
  }
}
