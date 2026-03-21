import { Component, OnDestroy, OnInit, inject } from '@angular/core';

import { ChatTab } from '@axe/chat-tab';
import { ChatTabList } from '@axe/chat-tab-list';
import { ObjectSerializer } from '@axe/core/synchronize-object/object-serializer';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/core/system';

import { ChatMessageService } from 'service/chat-message.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { SaveDataService } from 'service/save-data.service';
import { PeerCursor } from '@axe/peer-cursor';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-chat-tab-setting',
  templateUrl: './chat-tab-setting.component.html',
  styleUrls: ['./chat-tab-setting.component.css'],
  imports: [FormsModule, NgClass],
})
export class ChatTabSettingComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private chatMessageService = inject(ChatMessageService);
  private saveDataService = inject(SaveDataService);

  selectedTab: ChatTab = null!;
  selectedTabXml = '';

  get chatTabList(): ChatTabList {
    return ObjectStore.instance.get<ChatTabList>('ChatTabList');
  }

  get systemTabIndex(): number {
    return this.chatTabList.systemMessageTabIndex;
  }

  set systemTabIndex(index: number) {
    this.chatTabList.systemMessageTabIndex = index;
  }

  systemTab(): ChatTab {
    return this.chatTabList.systemMessageTab;
  }

  get tabName(): string {
    return this.selectedTab.name;
  }
  set tabName(tabName: string) {
    if (this.isEditable) this.selectedTab.name = tabName;
  }

  get chatTabs(): ChatTab[] {
    return this.chatMessageService.chatTabs;
  }
  get isEmpty(): boolean {
    return this.chatMessageService.chatTabs.length < 1;
  }
  get isDeleted(): boolean {
    return this.selectedTab ? ObjectStore.instance.get(this.selectedTab.identifier) == null : false;
  }
  get isEditable(): boolean {
    return !this.isEmpty && !this.isDeleted;
  }

  isSaveing = false;
  progresPercent = 0;

  allowDeleteLog = false;
  allowDeleteTab = false;
  modeCocLog = false;

  ngOnInit() {
    Promise.resolve().then(() => (this.modalService.title = this.panelService.title = 'チャットタブ設定'));
    EventSystem.register(this).on('DELETE_GAME_OBJECT', 2000, (event) => {
      if (!this.selectedTab || event.data.identifier !== this.selectedTab.identifier) return;
      const object = ObjectStore.instance.get(event.data.identifier);
      if (object !== null) {
        this.selectedTabXml = object.toXml();
      }
    });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  onChangeSelectTab(identifier: string) {
    this.selectedTab = ObjectStore.instance.get<ChatTab>(identifier);
    this.selectedTabXml = '';
  }

  onChangeSystemTab() {
    if (!this.selectedTab) {
      this.chatTabList.systemMessageTabIndex = 0;
    } else {
      const parentElement = this.selectedTab.parent;
      const index: number = parentElement.children.indexOf(this.selectedTab);
      this.chatTabList.systemMessageTabIndex = index;
    }
  }

  create() {
    ChatTabList.instance.addChatTab('タブ');
  }

  async save() {
    if (!this.selectedTab || this.isSaveing) return;
    this.isSaveing = true;
    this.progresPercent = 0;

    const fileName: string = 'chat_' + this.selectedTab.name;

    await this.saveDataService.saveGameObjectAsync(this.selectedTab, fileName, (percent) => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }

  get roomName(): string {
    const roomName =
      Network.peerContext && 0 < Network.peerContext.roomName.length ? Network.peerContext.roomName : 'ルームデータ';
    return roomName;
  }

  private appendTimestamp(fileName: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = ('00' + (date.getMonth() + 1)).slice(-2);
    const day = ('00' + date.getDate()).slice(-2);
    const hours = ('00' + date.getHours()).slice(-2);
    const minutes = ('00' + date.getMinutes()).slice(-2);

    return fileName + `_${year}-${month}-${day}_${hours}${minutes}`;
  }

  saveLog() {
    if (!this.selectedTab) return;
    const fileName: string = this.roomName + '_log_' + this.selectedTab.name;
    const fileName_: string = this.appendTimestamp(fileName);

    console.log('this.modeCocLog:' + this.modeCocLog);

    if (this.modeCocLog) {
      this.saveDataService.saveHtmlChatLogCoc(this.selectedTab, fileName_);
    } else {
      this.saveDataService.saveHtmlChatLog(this.selectedTab, fileName_);
    }
  }

  saveAllLog() {
    const fileName: string = this.roomName + '_log_' + '全タブ';
    const fileName_: string = this.appendTimestamp(fileName);

    console.log('this.modeCocLog:' + this.modeCocLog);

    if (this.modeCocLog) {
      this.saveDataService.saveHtmlChatLogAllCoc(fileName_);
    } else {
      this.saveDataService.saveHtmlChatLogAll(fileName_);
    }
  }

  delete() {
    if (!this.isEmpty && this.selectedTab) {
      const parentElement = this.selectedTab.parent;
      const index: number = parentElement.children.indexOf(this.selectedTab);
      this.selectedTabXml = this.selectedTab.toXml();
      this.selectedTab.destroy();

      if (this.systemTabIndex > index) {
        this.systemTabIndex--;
      }
      this.chkSystemTabIndex();
    }
  }

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  deleteLog() {
    if (!this.allowDeleteLog) return;

    if (!this.isEmpty && this.selectedTab) {
      while (this.selectedTab.children.length > 0) {
        this.selectedTab.children[0].destroy();
      }
      this.selectedTab.tachieReset();
    }
    const mess = 'ログをクリアしました';
    const gameSystem = null!;
    const sendTo = '';
    this.chatMessageService.sendMessage(
      this.selectedTab,
      mess,
      gameSystem,
      this.myPeer.identifier,
      sendTo,
      0,
      '#000000'
    );
  }

  deleteLogALL() {
    if (!this.allowDeleteLog) return;

    const mess = 'ログをクリアしました';
    const gameSystem = null!;
    const sendTo = '';

    for (const child of ChatTabList.instance.chatTabs) {
      while (child.children.length > 0) {
        child.children[0].destroy();
      }
      child.tachieReset();
      this.chatMessageService.sendMessage(child, mess, gameSystem, this.myPeer.identifier, sendTo, 0, '#000000');
    }
  }

  restore() {
    if (this.selectedTab && this.selectedTabXml) {
      const restoreTable = <ChatTab>ObjectSerializer.instance.parseXml(this.selectedTabXml);
      ChatTabList.instance.addChatTab(restoreTable);
      this.selectedTabXml = '';
    }
  }

  chkSystemTabIndex() {
    const list = this.chatTabList;
    if (this.systemTabIndex >= list.children.length) this.systemTabIndex = list.children.length - 1;
    if (this.systemTabIndex < 0) this.systemTabIndex = 0;
  }

  upTabIndex() {
    if (!this.selectedTab) return;
    const parentElement = this.selectedTab.parent;
    const index: number = parentElement.children.indexOf(this.selectedTab);
    if (0 < index) {
      const prevElement = parentElement.children[index - 1];
      parentElement.insertBefore(this.selectedTab, prevElement);
      if (this.systemTabIndex == index) {
        this.systemTabIndex--;
      } else if (this.systemTabIndex == index - 1) {
        this.systemTabIndex++;
      }
      this.chkSystemTabIndex();
    }
  }

  downTabIndex() {
    if (!this.selectedTab) return;
    const parentElement = this.selectedTab.parent;
    const index: number = parentElement.children.indexOf(this.selectedTab);
    if (index < parentElement.children.length - 1) {
      const nextElement = parentElement.children[index + 1];
      parentElement.insertBefore(nextElement, this.selectedTab);
      if (this.systemTabIndex == index) {
        this.systemTabIndex++;
      } else if (this.systemTabIndex == index + 1) {
        this.systemTabIndex--;
      }
      this.chkSystemTabIndex();
    }
  }
}
