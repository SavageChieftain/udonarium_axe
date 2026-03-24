import { Logger } from '@axe/core/logger';
import { ObjectStore } from '@axe/core/sync/object-store';
import { toHalfWidth } from '@axe/core/util/string-util';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage, ChatMessageContext, ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import GameSystemClass from 'bcdice/lib/game_system';

interface ResourceEditOption {
  limitMinMax: boolean;
  zeroLimit: boolean;
  isErr: boolean;
}

interface ResourceEdit {
  target: string;
  operator: string;
  diceResult: string;
  command: string;
  replace: string;
  isDiceRoll: boolean;
  calcAns: number;
  nowOrMax: string;
  option: ResourceEditOption;
  object: GameCharacter;
  targeted: boolean;
}

interface BuffEdit {
  command: string;
  object: GameCharacter;
  targeted: boolean;
}

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
      const isMatch = text.match(/(\s[sSｓＳ][tTｔＴ]?[:：&＆])/i) ? true : false;
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
    const ans: ResourceEditOption = {
      limitMinMax: false,
      zeroLimit: false,
      isErr: false,
    };
    const mat = toHalfWidth(text).match(/([A-CE-Z]+)$/i);
    if (!mat) return ans;
    let option = mat[1];

    if (option.match(/L/i)) {
      option = option.replace(/L/i, '');
      ans.limitMinMax = true;
    }

    if (option.match(/Z/i)) {
      option = option.replace(/Z/i, '');
      ans.zeroLimit = true;
    } else {
      ans.zeroLimit = false;
    }

    if (option.length != 0) {
      ans.isErr = true;
    }
    return ans;
  }

  commandToEdit(oneResourceEdit: ResourceEdit, text: string, object: GameCharacter, targeted: boolean): boolean {
    oneResourceEdit.object = object;
    oneResourceEdit.targeted = targeted;
    const replaceText = ` ${text.replace('：', ':').replace('＋', '+').replace('－', '-').replace('＝', '=').replace('＞', '>')}`;

    const resourceEditRegExp = /[:]([^-+=>]+)([-+=>])(.*)/;
    const resourceEditResult = replaceText.match(resourceEditRegExp);
    if (resourceEditResult![2] != '>' && resourceEditResult![3] == '') {
      return false;
    }

    const chkNowOrMaxString: string = resourceEditResult![1];
    let reg1: string;
    let reg1HalfWidth: string;

    const namematch = chkNowOrMaxString.match(/(.+)([\^＾]$)/);
    if (namematch) {
      reg1 = namematch[1];
      reg1HalfWidth = toHalfWidth(reg1);
      oneResourceEdit.nowOrMax = 'max';
    } else {
      reg1 = resourceEditResult![1];
      reg1HalfWidth = toHalfWidth(reg1);
      oneResourceEdit.nowOrMax = 'now';
    }

    const reg2: string = resourceEditResult![2];
    oneResourceEdit.operator = reg2;

    if (object.status.canChangeName(reg1)) {
      oneResourceEdit.target = reg1;
    } else if (object.status.canChangeName(reg1HalfWidth)) {
      oneResourceEdit.target = reg1HalfWidth;
    } else {
      return false;
    }

    if (oneResourceEdit.operator == '>') {
      oneResourceEdit.replace = resourceEditResult![3];
    } else {
      let reg3: string = resourceEditResult![3].replace(/[A-CE-ZＡ-ＣＥ-Ｚ]+$/i, '');
      const commandPrefix = oneResourceEdit.operator == '-' ? '-' : '';
      oneResourceEdit.command = `${commandPrefix}${toHalfWidth(reg3)}+(1d1-1)`;

      reg3 = reg3.replace(/[A-CE-ZＡ-ＣＥ-Ｚ]+$/i, '');

      const optionCommand = this.parseOption(resourceEditResult![3]);
      if (optionCommand.isErr) {
        return false;
      }
      oneResourceEdit.option = optionCommand;

      if (toHalfWidth(reg3).match(/\d[dD]/)) {
        oneResourceEdit.isDiceRoll = true;
      } else {
        oneResourceEdit.isDiceRoll = false;
      }
    }
    return true;
  }

  defaultResourceEdit(): ResourceEdit {
    return {
      target: '',
      operator: '',
      diceResult: '',
      command: '',
      replace: '',
      isDiceRoll: false,
      calcAns: 0,
      nowOrMax: 'now',
      option: null!,
      object: null!,
      targeted: false,
    };
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
      const targeted = oneText.match(/^t:/i) ? true : false;
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
      const targeted = oneText.match(/^t&/i) ? true : false;
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
    character.status.setText(edit.target, edit.replace);
    return `${edit.target}＞${edit.replace}    `;
  }

  resourceEdit(edit: ResourceEdit, character: GameCharacter): string {
    let optionText = '';
    let oldNum: number;
    let newNum: number;
    let nowOrMax = edit.nowOrMax;

    const maxNum = character.status.getValue(edit.target, 'max');
    if (nowOrMax == 'max' && maxNum == null) {
      nowOrMax = 'now';
    }
    if (nowOrMax == 'now') {
      oldNum = character.status.getValue(edit.target, 'now');
    } else {
      oldNum = character.status.getValue(edit.target, 'max');
    }

    if (edit.operator == '=') {
      newNum = edit.calcAns;
    } else {
      const flag = edit.option.zeroLimit;
      if (flag && edit.operator == '+' && edit.calcAns < 0) {
        newNum = oldNum + 0;
        optionText = '(0制限)';
      } else if (flag && edit.operator == '-' && edit.calcAns > 0) {
        newNum = oldNum + 0;
        optionText = '(0制限)';
      } else {
        newNum = oldNum + edit.calcAns;
      }
    }

    if (edit.option.limitMinMax && maxNum != null) {
      if (newNum > maxNum && nowOrMax == 'now') {
        newNum = maxNum;
        optionText = '(最大)';
      }
      if (newNum < 0) {
        newNum = 0;
        optionText = '(最小)';
      }
    }

    if (nowOrMax == 'now') {
      character.status.setValue(edit.target, 'now', newNum);
    } else {
      character.status.setValue(edit.target, 'max', newNum);
    }

    const operatorText = edit.operator == '-' ? '' : edit.operator;
    const changeMax = nowOrMax == 'max' ? '(最大値)' : '';
    return `${edit.target}${changeMax}:${oldNum}${operatorText}${edit.diceResult}＞${newNum}${optionText}    `;
  }

  buffEdit(buff: BuffEdit, character: GameCharacter): string {
    const command = buff.command;
    let text = '';
    if (buff.targeted) {
      text += `[${character.name}] `;
    }
    if (command.match(/^[tTｔＴ]?&[RＲrｒ]-$/i)) {
      character.buffs.decreaseRound();
      text += 'バフRを減少    ';
    } else if (command.match(/^[tTｔＴ]?&[RＲrｒ][+]$/i)) {
      character.buffs.increaseRound();
      text += 'バフRを増加    ';
    } else if (command.match(/^[tTｔＴ]?&[DＤdｄ]$/i)) {
      character.buffs.deleteZeroRound();
      text += '0R以下のバフを消去    ';
    } else if (command.match(/^[tTｔＴ]?&.+-$/i)) {
      const match = command.match(/^[tTｔＴ]?&(.+)-$/i);
      const reg1 = match![1];
      if (character.buffs.delete(reg1)) {
        text += `${reg1}を消去    `;
      }
    } else {
      const splittext = command.replace(/^[tTｔＴ]?&/i, '').split('/');
      let round: number | undefined = undefined;
      let sub = '';
      const buffname = splittext[0];
      let bufftext: string;
      bufftext = splittext[0];
      if (splittext.length > 1) {
        sub = splittext[1];
        bufftext = `${bufftext}/${splittext[1]}`;
      }
      if (splittext.length > 2) {
        if (splittext[2]) {
          round = parseInt(splittext[2]);
          if (Number.isNaN(round)) {
            round = 3;
          }
        } else {
          round = 3;
        }
        bufftext = `${bufftext}/${round}R`;
      }

      character.buffs.addRound(buffname, sub, round);
      text += `バフを付与 ${bufftext}    `;
    }
    return text;
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
