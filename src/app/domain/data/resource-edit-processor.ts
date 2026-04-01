import { Logger } from '@axe/core/logger';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage, ChatMessageContext, ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import GameSystemClass from 'bcdice/lib/game_system';

import {
  applyBuffEdit,
  applyResourceEdit,
  applyTextEdit,
  type BuffEdit,
  convertCommandToResourceEdit,
  createDefaultResourceEdit,
  parseResourceEditOption,
  type ResourceEdit,
  type ResourceEditOption,
} from './resource-edit-helpers';

interface DiceRollResult {
  id: string | null;
  result: string;
  isSecret: boolean;
}

interface ResourceByCharacter {
  resourceCommand: string;
  object: GameCharacter;
}

interface BuffByCharacter {
  buffCommand: string;
  object: GameCharacter;
}

export { BuffByCharacter, BuffEdit, DiceRollResult, ResourceByCharacter, ResourceEdit, ResourceEditOption };

export class ResourceEditProcessor {
  constructor(
    private diceRollAsync: (message: string, gameSystem: GameSystemClass) => Promise<DiceRollResult>,
    private loadGameSystemAsync: (gameType: string) => Promise<GameSystemClass>
  ) {}

  checkResourceEditCommand(originalMessage: ChatMessage, messageTargetContext: ChatMessageTargetContext[]) {
    const resourceByCharacter: ResourceByCharacter[] = [];
    const buffByCharacter: BuffByCharacter[] = [];

    const sendFromObject = this.messageSendGameCharacter(originalMessage.sendFrom);
    let isSecret = false;

    for (const oneMessageTargetContext of messageTargetContext) {
      const text = ` ${oneMessageTargetContext.text}`;
      const isMatch = !!text.match(/(\s[sSｓＳ][tTｔＴ]?[:：&＆])/i);
      if (isMatch) {
        isSecret = true;
      }

      const text2 = text.replace(/(\s[sSｓＳ][tTｔＴ][:：])/i, ' t:');
      const text3 = text2.replace(/(\s[sSｓＳ][:：])/i, ' :');
      const text4 = text3.replace(/([tTｔＴ][:：])/gi, 't:');
      const text5 = text4.replace(/([tTｔＴ][&＆])/gi, 't&');
      const text6 = text5.replace(/([:：])/gi, ':');
      const text7 = text6.replace(/([&＆])/gi, '&');

      const splitText = text7.split(/\s/);

      for (const chktxt of splitText) {
        if (chktxt.match(/^(t?[:&][^:：&＆])+/gi)) {
          //正常。処理無し
        } else {
          continue;
        }

        const resultRes = chktxt.match(/t?:[^:：&＆]+/gi);
        const resultBuff = chktxt.match(/t?&[^:：&＆]+/gi);

        if (resultRes) {
          for (const res of resultRes) {
            resourceByCharacter.push({
              resourceCommand: res,
              object: oneMessageTargetContext.object!,
            });
          }
        }
        if (resultBuff) {
          for (const buff of resultBuff) {
            buffByCharacter.push({
              buffCommand: buff,
              object: oneMessageTargetContext.object!,
            });
          }
        }
      }
    }
    this.resourceEditProcess(sendFromObject, resourceByCharacter, buffByCharacter, originalMessage, isSecret);
  }

  parseOption(text: string): ResourceEditOption {
    return parseResourceEditOption(text);
  }

  commandToEdit(oneResourceEdit: ResourceEdit, text: string, object: GameCharacter, targeted: boolean): boolean {
    return convertCommandToResourceEdit(oneResourceEdit, text, object, targeted);
  }

  defaultResourceEdit(): ResourceEdit {
    return createDefaultResourceEdit();
  }

  async resourceEditProcess(
    sendFromObject: GameCharacter,
    resourceByCharacter: ResourceByCharacter[],
    buffByCharacter: BuffByCharacter[],
    originalMessage: ChatMessage,
    isSecret: boolean
  ) {
    const allEditList: ResourceEdit[] = [];
    const gameSystem = await this.loadGameSystemAsync(originalMessage.tags ? originalMessage.tags[0] : '');

    for (const res of resourceByCharacter) {
      const oneText = res.resourceCommand;
      const targeted = !!oneText.match(/^t:/i);
      let obj: GameCharacter;
      if (targeted) {
        const object = res.object;
        const oneResourceEdit = this.defaultResourceEdit();
        if (!this.commandToEdit(oneResourceEdit, oneText, object, targeted)) return;
        if (oneResourceEdit.operator != '>') {
          try {
            const rollResult = await this.diceRollAsync(oneResourceEdit.command, gameSystem);
            if (!rollResult.result) {
              return null!;
            }
            const splitResult = rollResult.result.split(' ＞ ');
            oneResourceEdit.diceResult = splitResult[splitResult.length - 2].replace(/\+\(1\[1\]-1\)$/, '');
            const resultMatch = rollResult.result.match(/([-+]?\d+)$/);
            oneResourceEdit.calcAns = parseInt(resultMatch![1], 10);
          } catch (e) {
            Logger.error('[DiceBot] リソース編集のダイスロールエラー', e);
          }
        }
        allEditList.push(oneResourceEdit);
      } else {
        if (sendFromObject == null) {
          Logger.debug('[DiceBot] 送信元がキャラクターではないためリソース操作不可');
          return;
        } else {
          obj = sendFromObject;
          const oneResourceEdit = this.defaultResourceEdit();
          if (!this.commandToEdit(oneResourceEdit, oneText, obj, targeted)) return;
          if (oneResourceEdit.operator != '>') {
            try {
              const rollResult = await this.diceRollAsync(oneResourceEdit.command, gameSystem);
              if (!rollResult.result) {
                return null!;
              }
              const splitResult = rollResult.result.split(' ＞ ');
              oneResourceEdit.diceResult = splitResult[splitResult.length - 2].replace(/\+\(1\[1\]-1\)$/, '');
              const resultMatch = rollResult.result.match(/([-+]?\d+)$/);
              oneResourceEdit.calcAns = parseInt(resultMatch![1], 10);
            } catch (e) {
              Logger.error('[DiceBot] リソース編集のダイスロールエラー', e);
            }
          }
          allEditList.push(oneResourceEdit);
        }
      }
    }

    const repBuffCommandList: BuffEdit[] = [];
    for (const buff of buffByCharacter) {
      const oneText = buff.buffCommand;
      const targeted = !!oneText.match(/^t&/i);
      if (targeted) {
        const object = buff.object;
        const replaceText = oneText.replace('＆', '&').replace(/＋$/, '+').replace(/－$/, '-');
        repBuffCommandList.push({
          command: replaceText,
          object: object,
          targeted: targeted,
        });
      } else {
        if (sendFromObject == null) {
          Logger.debug('[DiceBot] 送信元がキャラクターではないためバフ操作不可');
          return;
        } else {
          const replaceText = oneText.replace('＆', '&').replace(/＋$/, '+').replace(/－$/, '-');
          repBuffCommandList.push({
            command: replaceText,
            object: sendFromObject,
            targeted: targeted,
          });
        }
      }
    }

    this.applyResourceBuffEdits(allEditList, repBuffCommandList, originalMessage, isSecret);
  }

  textEdit(edit: ResourceEdit, character: GameCharacter): string {
    return applyTextEdit(edit, character);
  }

  resourceEdit(edit: ResourceEdit, character: GameCharacter): string {
    return applyResourceEdit(edit, character);
  }

  buffEdit(buff: BuffEdit, character: GameCharacter): string {
    return applyBuffEdit(buff, character);
  }

  private applyResourceBuffEdits(
    allEditList: ResourceEdit[],
    buffList: BuffEdit[],
    originalMessage: ChatMessage,
    isSecret: boolean
  ) {
    let text = '';
    let isDiceRoll = false;
    for (const edit of allEditList) {
      const character = edit.object;
      if (edit.targeted) {
        text += `[${character.name}] `;
      }
      if (edit.operator == '>') {
        text += this.textEdit(edit, character);
      } else {
        text += this.resourceEdit(edit, character);
      }
      if (edit.isDiceRoll) {
        isDiceRoll = true;
      }
    }
    for (const buff of buffList) {
      text += this.buffEdit(buff, buff.object);
    }
    text = text.replace(/\s\s\s\s$/, '');

    if (text == '') return;
    let fromText: string;
    let nameText: string;
    if (isDiceRoll) {
      fromText = 'System-BCDice';
      nameText = `<BCDice：${originalMessage.name}>`;
    } else {
      fromText = 'System';
      nameText = originalMessage.name;
    }
    const resourceMessage: ChatMessageContext = {
      identifier: '',
      tabIdentifier: originalMessage.tabIdentifier,
      originFrom: originalMessage.from,
      from: fromText,
      timestamp: originalMessage.timestamp + 2,
      imageIdentifier: PeerCursor.myCursor.diceImageIdentifier,
      tag: isSecret ? 'system secret' : 'system',
      name: nameText,
      text,
      messColor: originalMessage.messColor,
    };
    const chatTab = ObjectStore.instance.get<ChatTab>(originalMessage.tabIdentifier);
    if (chatTab) {
      chatTab.addMessage(resourceMessage);
    }
  }

  private messageSendGameCharacter(from: string): GameCharacter {
    const object = ObjectStore.instance.get<GameCharacter>(from);
    if (object instanceof GameCharacter) {
      return object;
    } else {
      Logger.debug('[DiceBot] 送信元がキャラクターではないため無視');
      return null!;
    }
  }
}
