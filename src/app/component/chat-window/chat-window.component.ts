import { AfterViewInit, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessage, ChatMessageTargetContext } from '@axe/chat-message';
import { ChatTab } from '@axe/chat-tab';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { DiceBot } from '@axe/dice-bot';
import { GameCharacter } from '@axe/game-character';
import { PeerCursor } from '@axe/peer-cursor';
import GameSystemClass from 'bcdice/lib/game_system';
import { AlarmMenuComponent } from 'component/alarm-menu/alarm-menu.component';
import { BadgeComponent } from 'component/badge/badge.component';
import { ChatInputComponent } from 'component/chat-input/chat-input.component';
import { ChatTabComponent } from 'component/chat-tab/chat-tab.component';
import { ChatTabSettingComponent } from 'component/chat-tab-setting/chat-tab-setting.component';
import { ChatTachieComponent } from 'component/chat-tachie/chat-tachie.component';
import { DiceTableSettingComponent } from 'component/dice-table-setting/dice-table-setting.component';
import { VoteMenuComponent } from 'component/vote-menu/vote-menu.component';
import { ChatMessageService } from 'service/chat-message.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

@Component({
  selector: 'chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.css'],
  imports: [ChatTabComponent, FormsModule, ChatTachieComponent, BadgeComponent, ChatInputComponent],
})
export class ChatWindowComponent implements OnInit, OnDestroy, AfterViewInit {
  chatMessageService = inject(ChatMessageService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);

  sendFrom: string = 'Guest';

  get gameType(): string {
    return !this.chatMessageService.gameType ? 'DiceBot' : this.chatMessageService.gameType;
  }
  set gameType(gameType: string) {
    this.chatMessageService.gameType = gameType;
  }

  private _chatTabidentifier: string = '';
  get chatTabidentifier(): string {
    return this._chatTabidentifier;
  }
  set chatTabidentifier(chatTabidentifier: string) {
    const hasChanged: boolean = this._chatTabidentifier !== chatTabidentifier;
    this._chatTabidentifier = chatTabidentifier;
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

  private testcount: number = 0;

  get chatTab(): ChatTab {
    return this.objectStore.get<ChatTab>(this.chatTabidentifier);
  }
  isAutoScroll: boolean = true;
  scrollToBottomTimer: NodeJS.Timeout = null!;
  testadd() {
    this.chatTab.count++;
  }
  get testmess(): string[] {
    return this.chatTab.imageIdentifier;
  }

  ngOnInit() {
    this.sendFrom = PeerCursor.myCursor.identifier;
    this._chatTabidentifier =
      0 < this.chatMessageService.chatTabs.length ? this.chatMessageService.chatTabs[0].identifier : '';

    EventSystem.register(this).on('MESSAGE_ADDED', (event) => {
      if (event.data.tabIdentifier !== this.chatTabidentifier) return;
      const message = this.objectStore.get<ChatMessage>(event.data.messageIdentifier);
      if (message && message.isSendFromSelf) {
        this.isAutoScroll = true;
      } else {
        this.checkAutoScroll();
      }
      if (this.isAutoScroll && this.chatTab) this.chatTab.markForRead();
    });
    queueMicrotask(() => this.updatePanelTitle());
  }

  ngAfterViewInit() {
    queueMicrotask(() => this.scrollToBottom(true));
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  // @TODO やり方はもう少し考えた方がいいい
  scrollToBottom(isForce: boolean = false) {
    if (isForce) this.isAutoScroll = true;
    if (!this.isAutoScroll) return;
    const event = new CustomEvent('scrolltobottom', {});
    this.panelService.scrollablePanel.dispatchEvent(event);
    if (this.scrollToBottomTimer != null) return;
    this.scrollToBottomTimer = setTimeout(() => {
      if (this.chatTab) this.chatTab.markForRead();
      this.scrollToBottomTimer = null!;
      this.isAutoScroll = false;
      if (this.panelService.scrollablePanel) {
        this.panelService.scrollablePanel.scrollTop = this.panelService.scrollablePanel.scrollHeight;
      }
    }, 0);
  }

  // @TODO
  checkAutoScroll() {
    if (!this.panelService.scrollablePanel) return;
    const top = this.panelService.scrollablePanel.scrollHeight - this.panelService.scrollablePanel.clientHeight;
    if (top - 150 <= this.panelService.scrollablePanel.scrollTop) {
      this.isAutoScroll = true;
    } else {
      this.isAutoScroll = false;
    }
  }

  updatePanelTitle() {
    if (this.chatTab) {
      this.panelService.title = 'チャットウィンドウ - ' + this.chatTab.name;
      this.panelService.chatTab = this.chatTab;
    } else {
      this.panelService.title = 'チャットウィンドウ';
      this.panelService.chatTab = null!;
    }
  }

  onSelectedTab(_identifier: string) {
    this.updatePanelTitle();
  }

  showTabSetting() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x - 250, top: coordinate.y - 175, width: 500, height: 380 };
    const component = this.panelService.open<ChatTabSettingComponent>(ChatTabSettingComponent, option);
    component.selectedTab = this.chatTab;
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
