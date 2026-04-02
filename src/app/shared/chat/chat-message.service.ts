import { inject, Injectable } from '@angular/core';
import { Network } from '@axe/core/index';
import { Logger } from '@axe/core/logging/logger';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage, ChatMessageContext, ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DataElement } from '@axe/domain/data/data-element';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { emitDiceTableMessage, emitResourceEditMessage, emitSendMessage } from '@axe/domain/domain-events';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import {
  calcChatTimestamp,
  emitChatMessageEvents,
  findImageIdentifierByName,
  parseTachieCommand,
  resolveChatMessageTag,
  resolveImagePos,
  resolveMessageColor,
  resolveTachieIndex,
  stripTachieCommand,
} from '@axe/shared/chat/chat-message-helpers';
import GameSystemClass from 'bcdice/lib/game_system';

const HOURS = 60 * 60 * 1000;

@Injectable()
export class ChatMessageService {
  private objectStore = inject(ObjectStore);
  private imageStorage = inject(ImageStorage);
  private chatTabList = inject(ChatTabList);

  private intervalTimer: NodeJS.Timeout | null = null;
  private timeOffset: number = Date.now();
  private performanceOffset: number = performance.now();

  private ntpApiUrls: string[] = ['https://worldtimeapi.org/api/ip'];

  gameType: string = 'DiceBot';

  get chatTabs(): ChatTab[] {
    return this.chatTabList.chatTabs;
  }

  calibrateTimeOffset() {
    if (this.intervalTimer != null) {
      return;
    }
    const index = Math.floor(Math.random() * this.ntpApiUrls.length);
    const ntpApiUrl = this.ntpApiUrls[index];
    const sendTime = performance.now();
    fetch(ntpApiUrl)
      .then((response) => {
        if (response.ok) return response.json();
        throw new Error('Network response was not ok.');
      })
      .then((jsonObj) => {
        const endTime = performance.now();
        const latency = (endTime - sendTime) / 2;
        const timeobj = jsonObj;
        const st: number = new Date(timeobj.utc_datetime).getTime();
        const fixedTime = st + latency;
        this.timeOffset = fixedTime;
        this.performanceOffset = endTime;
        Logger.info(`[TimeSync] 時刻同期完了 (過延: ${latency.toFixed(0)}ms, offset: ${fixedTime.toFixed(0)})`);
        this.setIntervalTimer();
      })
      .catch((error) => {
        Logger.warn('[TimeSync] 時刻同期失敗', error.message);
        this.setIntervalTimer();
      });
    this.setIntervalTimer();
  }

  private setIntervalTimer() {
    if (this.intervalTimer != null) clearTimeout(this.intervalTimer);
    this.intervalTimer = setTimeout(() => {
      this.intervalTimer = null;
      this.calibrateTimeOffset();
    }, 6 * HOURS);
  }

  getTime(): number {
    return Math.floor(this.timeOffset + (performance.now() - this.performanceOffset));
  }

  // システムメッセージ専用
  sendSystemMessage(text: string, color?: string): ChatMessage {
    const chatTabList = this.objectStore.get<ChatTabList>('ChatTabList');
    const sysTab = chatTabList!.systemMessageTab!;
    const messageColor = resolveMessageColor(color, '#006633');
    const chatMessage: ChatMessageContext = {
      name: 'システムメッセージ',
      imageIdentifier: '',
      timestamp: this.calcTimeStamp(sysTab),
      tag: 'system-message',
      text,
      imagePos: -1,
      messColor: messageColor,
    };
    return sysTab.addMessage(chatMessage);
  }

  sendSystemMessageOnePlayer(chatTab: ChatTab, text: string, sendTo: string, color?: string): ChatMessage {
    const messageColor = resolveMessageColor(color, '#006633');
    const chatMessage: ChatMessageContext = {
      from: this.findId(sendTo),
      to: this.findId(sendTo),
      name: 'システムメッセージ',
      imageIdentifier: '',
      timestamp: this.calcTimeStamp(chatTab),
      tag: 'DiceBot to-pl-system-message',
      text: text,
      imagePos: -1,
      messColor: messageColor,
      sendFrom: undefined,
    };
    return chatTab.addMessage(chatMessage);
  }

  // 最終発言キャラでシステム発言
  sendSystemMessageLastSendCharactor(text: string) {
    const chatTabList = this.objectStore.get<ChatTabList>('ChatTabList');
    const sysTab = chatTabList!.systemMessageTab!;
    const sendFrom = PeerCursor.myCursor.lastControlSendFrom
      ? PeerCursor.myCursor.lastControlSendFrom
      : PeerCursor.myCursor.identifier;
    let imgIndex = PeerCursor.myCursor.lastControlImageIndex;
    const imageIdentifier = this.findImageIdentifier(sendFrom, imgIndex);
    if (imageIdentifier != PeerCursor.myCursor.lastControlImageIdentifier) imgIndex = 0;
    this.sendMessage(sysTab!, text, null, sendFrom, undefined, imgIndex, '#006633');
  }

  sendMessage(
    chatTab: ChatTab,
    text: string,
    gameSystem: GameSystemClass | null,
    sendFrom: string,
    sendTo?: string,
    tachieNum?: number,
    color?: string,
    messageTargetContext?: ChatMessageTargetContext[]
  ): ChatMessage {
    const imgIndex = resolveTachieIndex(tachieNum);
    const messageColor = resolveMessageColor(color, '#000000');

    const dicebot = this.objectStore.get<DiceBot>('DiceBot')!;
    const chatMessageTag = resolveChatMessageTag(gameSystem, text, dicebot);

    const chatMessage: ChatMessageContext = {
      from: Network.peerContext.userId,
      to: sendTo != null ? this.findId(sendTo) : undefined,
      name: this.makeMessageName(sendFrom, sendTo),
      imageIdentifier: this.findImageIdentifier(sendFrom, imgIndex),
      timestamp: this.calcTimeStamp(chatTab),
      tag: chatMessageTag,
      text: text,
      imagePos: this.findImagePos(sendFrom),
      messColor: messageColor,
      sendFrom: sendFrom,
    };

    this.setLastControlInfoToPeer(sendFrom, this.findImageIdentifier(sendFrom, imgIndex), imgIndex, sendTo);

    this.applyTachieCommand(chatMessage, text, sendFrom);
    const chat = chatTab.addMessage(chatMessage);

    const eventPlan = emitChatMessageEvents(messageTargetContext ?? undefined);
    for (const target of eventPlan.sendTargets) {
      emitSendMessage({
        messageIdentifier: chat.identifier,
        messageTrget: target,
      });
    }
    emitDiceTableMessage({ messageIdentifier: chat.identifier });
    emitResourceEditMessage({
      messageIdentifier: chat.identifier,
      messageTargetContext: eventPlan.resourceEditTargetContext,
    });

    return chat;
  }

  private applyTachieCommand(chatMessage: ChatMessageContext, text: string, sendFrom: string): void {
    const command = parseTachieCommand(text);
    if (command.type === 'none') return;

    if (command.type === 'hide') {
      chatMessage.imageIdentifier = '';
      chatMessage.text = stripTachieCommand(text);
      return;
    }

    if (command.type === 'index') {
      const newIdentifier = this.findImageIdentifier(sendFrom, command.index);
      if (!newIdentifier) return;

      chatMessage.imageIdentifier = newIdentifier;
      chatMessage.text = stripTachieCommand(text);
      const obj = this.objectStore.get(sendFrom);
      if (obj instanceof GameCharacter) obj.selectedTachieNum = command.index;
      return;
    }

    const found = this.findImageIdentifierName(sendFrom, command.name);
    if (!found.identifier) return;

    chatMessage.imageIdentifier = found.identifier;
    chatMessage.text = stripTachieCommand(text);
    const obj = this.objectStore.get(sendFrom);
    if (obj instanceof GameCharacter) obj.selectedTachieNum = found.index;
  }

  private findId(identifier: string): string {
    const object = this.objectStore.get(identifier);
    if (object instanceof GameCharacter) {
      return object.identifier;
    } else if (object instanceof PeerCursor) {
      return object.userId;
    }
    return '';
  }

  private findObjectName(identifier: string): string {
    const object = this.objectStore.get(identifier);
    if (object instanceof GameCharacter) {
      return object.name;
    } else if (object instanceof PeerCursor) {
      return object.name;
    }
    return identifier;
  }

  private makeMessageName(sendFrom: string, sendTo?: string): string {
    const sendFromName = this.findObjectName(sendFrom);
    if (sendTo == null || sendTo.length < 1) return sendFromName;
    const sendToName = this.findObjectName(sendTo);
    return sendFromName + ' > ' + sendToName;
  }

  private setLastControlInfoToPeer(sendFrom: string, imageIdentifier: string, imgindex: number, sendTo?: string): void {
    const sendFromName = this.findObjectName(sendFrom);
    const peerCursor = PeerCursor.myCursor;

    if (!peerCursor) {
      return;
    }
    if (sendTo == null || sendTo.length < 1) {
      if (peerCursor.lastControlImageIdentifier != imageIdentifier) {
        peerCursor.lastControlImageIdentifier = imageIdentifier;
      }
      if (peerCursor.lastControlCharacterName != sendFromName) {
        peerCursor.lastControlCharacterName = sendFromName;
      }
      peerCursor.lastControlSendFrom = sendFrom;
      peerCursor.lastControlImageIndex = imgindex;
    } else {
      // 秘話時は操作なし
    }
  }

  private findImageIdentifierName(sendFrom: string, name: string): { identifier: string; index: number } {
    const object = this.objectStore.get(sendFrom);
    if (object instanceof GameCharacter) {
      const data: DataElement = object.imageDataElement;
      const entries: { label: string; identifier: string }[] = [];
      for (const child of data.children) {
        if (child instanceof DataElement) {
          const img = this.imageStorage.get(child.value as string);
          entries.push({
            label: child.getAttribute('currentValue'),
            identifier: img ? img.identifier : '',
          });
        }
      }
      return findImageIdentifierByName(entries, name);
    }
    return { identifier: '', index: 0 };
  }

  private findImageIdentifier(sendFrom: string, index: number): string {
    const object = this.objectStore.get(sendFrom);
    if (object instanceof GameCharacter) {
      if (object.imageDataElement.children.length > index) {
        const img = this.imageStorage.get(object.imageDataElement.children[index].value as string);
        if (img) {
          return img.identifier;
        }
      }
      return '';
    } else if (object instanceof PeerCursor) {
      return object.imageIdentifier;
    }
    return '';
  }

  // entyu
  private findImagePos(identifier: string): number {
    const object = this.objectStore.get(identifier);
    if (object instanceof GameCharacter) {
      const element = object.detailDataElement.getFirstElementByName('POS');
      return resolveImagePos(element ? <number>element.currentValue : undefined);
    }
    return -1;
  }
  //
  private calcTimeStamp(chatTab: ChatTab): number {
    const now = this.getTime();
    const latest = chatTab.latestTimeStamp;
    return calcChatTimestamp(now, latest);
  }
}
