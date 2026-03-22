import { inject, Injectable } from '@angular/core';
import { ChatMessage, ChatMessageContext, ChatMessageTargetContext } from '@axe/chat-message';
import { ChatTab } from '@axe/chat-tab';
import { ChatTabList } from '@axe/chat-tab-list';
import { ImageStorage } from '@axe/core/file-storage/image-storage';
import { Logger } from '@axe/core/logger';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { Network } from '@axe/core/system';
import { DataElement } from '@axe/data-element';
import { DiceBot } from '@axe/dice-bot';
import { GameCharacter } from '@axe/game-character';
import { PeerCursor } from '@axe/peer-cursor';
import GameSystemClass from 'bcdice/lib/game_system';

const HOURS = 60 * 60 * 1000;

@Injectable()
export class ChatMessageService {
  private objectStore = inject(ObjectStore);
  private imageStorage = inject(ImageStorage);
  private chatTabList = inject(ChatTabList);

  private intervalTimer: NodeJS.Timeout = null!;
  private timeOffset: number = Date.now();
  private performanceOffset: number = performance.now();

  private ntpApiUrls: string[] = ['https://worldtimeapi.org/api/ip'];

  gameType: string = 'DiceBot';

  constructor() {}

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
      this.intervalTimer = null!;
      this.calibrateTimeOffset();
    }, 6 * HOURS);
  }

  getTime(): number {
    return Math.floor(this.timeOffset + (performance.now() - this.performanceOffset));
  }

  // システムメッセージ専用
  sendSystemMessageOnePlayer(chatTab: ChatTab, text: string, sendTo: string, color?: string): ChatMessage {
    let _color;
    if (!color) {
      _color = '#006633';
    } else {
      _color = color;
    }
    const chatMessage: ChatMessageContext = {
      from: this.findId(sendTo),
      to: this.findId(sendTo),
      name: 'システムメッセージ',
      imageIdentifier: '',
      timestamp: this.calcTimeStamp(chatTab),
      tag: 'DiceBot to-pl-system-message',
      text: text,
      imagePos: -1,
      messColor: _color,
      sendFrom: undefined,
    };
    return chatTab.addMessage(chatMessage);
  }

  // 最終発言キャラでシステム発言
  sendSystemMessageLastSendCharactor(text: string) {
    const chatTabList = this.objectStore.get<ChatTabList>('ChatTabList');
    const sysTab = chatTabList.systemMessageTab;
    const sendFrom = PeerCursor.myCursor.lastControlSendFrom
      ? PeerCursor.myCursor.lastControlSendFrom
      : PeerCursor.myCursor.identifier;
    let imgIndex = PeerCursor.myCursor.lastControlImageIndex;
    const imageIdentifier = this.findImageIdentifier(sendFrom, imgIndex);
    if (imageIdentifier != PeerCursor.myCursor.lastControlImageIdentifier) imgIndex = 0;
    this.sendMessage(sysTab, text, null, sendFrom, undefined, imgIndex, '#006633');
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
    let imgIndex: number;
    if (tachieNum != null && tachieNum > 0) {
      imgIndex = tachieNum;
    } else {
      imgIndex = 0;
    }

    let _color;
    if (!color) {
      _color = '#000000';
    } else {
      _color = color;
    }

    const dicebot = this.objectStore.get<DiceBot>('DiceBot');
    let chatMessageTag: string;
    if (gameSystem == null) {
      chatMessageTag = '';
    } else if (dicebot.checkSecretDiceCommand(gameSystem, text)) {
      chatMessageTag = `${gameSystem.ID} secret`;
    } else if (dicebot.checkSecretEditCommand(text)) {
      chatMessageTag = `${gameSystem.ID} secret`;
    } else {
      chatMessageTag = gameSystem.ID;
    }

    const chatMessage: ChatMessageContext = {
      from: Network.peerContext.userId,
      to: sendTo != null ? this.findId(sendTo) : undefined,
      name: this.makeMessageName(sendFrom, sendTo),
      imageIdentifier: this.findImageIdentifier(sendFrom, imgIndex),
      timestamp: this.calcTimeStamp(chatTab),
      tag: chatMessageTag,
      text: text,
      imagePos: this.findImagePos(sendFrom),
      messColor: _color,
      sendFrom: sendFrom,
    };

    this.setLastControlInfoToPeer(sendFrom, this.findImageIdentifier(sendFrom, imgIndex), imgIndex, sendTo);

    // 立ち絵置き換え
    const chkMessage = ' ' + text;

    const matchesArray = chkMessage.match(/\s[@＠](\S+)\s*$/i);
    if (matchesArray) {
      const matchHide = matchesArray[1].match(/^[hHｈＨ][iIｉＩ][dDｄＤ][eEｅＥ]$/);
      const matchNum = matchesArray[1].match(/(\d+)$/);

      if (matchHide) {
        // 非表示コマンド
        chatMessage.imageIdentifier = '';
        chatMessage.text = text.replace(/([@＠]\S+\s*)$/i, '');
      } else if (matchNum) {
        // インデックス指定
        const num: number = parseInt(matchNum[1]);
        const newIdentifier = this.findImageIdentifier(sendFrom, num);
        if (newIdentifier) {
          chatMessage.imageIdentifier = newIdentifier;
          chatMessage.text = text.replace(/([@＠]\S+\s*)$/i, '');
          const obj = this.objectStore.get(sendFrom);
          if (obj instanceof GameCharacter) {
            obj.selectedTachieNum = parseInt(matchNum[1]);
          }
        }
      } else {
        const tachieName = matchesArray[1];
        const newIdentifier = this.findImageIdentifierName(sendFrom, tachieName);
        if (newIdentifier) {
          chatMessage.imageIdentifier = newIdentifier;
          chatMessage.text = text.replace(/([@＠]\S+\s*)$/i, '');
          const obj = this.objectStore.get(sendFrom);
          if (obj instanceof GameCharacter) {
            obj.selectedTachieNum = this._ImageIndex;
          }
        }
      }
    }
    return chatTab.addMessage(chatMessage, messageTargetContext ?? undefined);
  }

  private findId(identifier: string): string {
    const object = this.objectStore.get(identifier);
    if (object instanceof GameCharacter) {
      return object.identifier;
    } else if (object instanceof PeerCursor) {
      return object.userId;
    }
    return null!;
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

  private _ImageIndex = 0;
  private findImageIdentifierName(sendFrom: string, name: string): string {
    // 完全一致
    const object = this.objectStore.get(sendFrom);
    this._ImageIndex = 0;
    if (object instanceof GameCharacter) {
      const data: DataElement = object.imageDataElement;
      for (const child of data.children) {
        if (child instanceof DataElement) {
          if (child.getAttribute('currentValue') == name) {
            const img = this.imageStorage.get(<string>child.value);
            if (img) {
              return img.identifier;
            }
          }
        }
        this._ImageIndex++;
      }
      // 部分前方一致
      this._ImageIndex = 0;
      for (const child of data.children) {
        if (child instanceof DataElement) {
          if (child.getAttribute('currentValue').indexOf(name) == 0) {
            const img = this.imageStorage.get(<string>child.value);
            if (img) {
              return img.identifier;
            }
          }
        }
        this._ImageIndex++;
      }
    }
    return '';
  }

  private findImageIdentifier(sendFrom: string, index: number): string {
    const object = this.objectStore.get(sendFrom);
    if (object instanceof GameCharacter) {
      if (object.imageDataElement.children.length > index) {
        const img = this.imageStorage.get(<string>object.imageDataElement.children[index].value);
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
      if (element)
        if (0 <= <number>element.currentValue && <number>element.currentValue <= 11)
          return <number>element.currentValue;
      return 0;
    }
    return -1;
  }
  //
  private calcTimeStamp(chatTab: ChatTab): number {
    const now = this.getTime();
    const latest = chatTab.latestTimeStamp;
    return now <= latest ? latest + 1 : now;
  }
}
