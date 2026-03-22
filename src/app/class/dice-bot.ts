import GameSystemClass from 'bcdice/lib/game_system';
import { GameSystemInfo } from 'bcdice/lib/bcdice/game_system_list.json';
import StaticLoader from 'bcdice/lib/loader/static_loader';
import { ChatMessage, ChatMessageContext, ChatMessageTargetContext } from './chat-message';
import { ChatTab } from './chat-tab';
import { SyncObject } from './core/synchronize-object/decorator';
import { GameObject } from './core/synchronize-object/game-object';
import { GameCharacter } from './game-character';

import { ObjectStore } from './core/synchronize-object/object-store';
import { EventSystem } from './core/system';
import { PromiseQueue } from './core/system/util/promise-queue';
import { toHalfWidth } from './core/system/util/string-util';
import { DiceTable } from './dice-table';

import { Logger } from './core/logger';
import { PeerCursor } from './peer-cursor';

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

@SyncObject('dice-bot')
export class DiceBot extends GameObject {
  private static loader: StaticLoader;
  private static queue: PromiseQueue = DiceBot.initializeDiceBotQueue();

  static diceBotInfos: GameSystemInfo[] = [];

  static getCustomGameSystemInfo(ststem: GameSystemClass, locale: string): GameSystemInfo {
    const gameSystemInfo: GameSystemInfo = {
      id: ststem.ID,
      name: ststem.NAME,
      className: ststem.ID,
      sortKey: ststem.SORT_KEY,
      locale: locale,
      superClassName: 'Base',
    };
    return gameSystemInfo;
  }

  private static listAvailableGameSystems(): GameSystemInfo[] {
    const diceBotInfos: GameSystemInfo[] = DiceBot.loader.listAvailableGameSystems();
    return diceBotInfos;
  }

  static async diceRollAsync(message: string, gameSystem: GameSystemClass): Promise<DiceRollResult> {
    return DiceBot.queue.add(() => {
      try {
        const result = gameSystem.eval(message);
        if (result) {
          Logger.info(`[DiceRoll] ${gameSystem.ID}: ${result.text}${result.secret ? ' (secret)' : ''}`);
          return {
            id: gameSystem.ID,
            result: `${gameSystem.ID} : ${result.text}`.replace(/\n?(#\d+)\n/gi, '$1 '), // 繰り返しダイスロールは改行表示を短縮する
            isSecret: result.secret,
          };
        }
      } catch (e) {
        Logger.error('[DiceBot] ダイスロール失敗', e);
      }
      return { id: gameSystem.ID, result: '', isSecret: false };
    });
  }

  static async getHelpMessage(gameType: string): Promise<string> {
    try {
      const gameSystem = await DiceBot.loadGameSystemAsync(gameType);
      return gameSystem.HELP_MESSAGE;
    } catch (e) {
      Logger.error('[DiceBot] ヘルプメッセージ取得失敗', e);
    }
    return '';
  }

  static loadCustomGameSystem(_gameType: string): GameSystemClass | null {
    // 追加カスタムダイスは下記追記
    // if( gameType == '***') return ***;

    return null!;
  }

  static async loadGameSystemAsync(gameType: string): Promise<GameSystemClass> {
    return await DiceBot.queue.add(() => {
      const system = this.loadCustomGameSystem(gameType);
      if (system) {
        return system;
      }
      const id = this.diceBotInfos.some((info) => info.id === gameType) ? gameType : 'DiceBot';
      try {
        return DiceBot.loader.getGameSystemClass(id);
      } catch {
        return DiceBot.loader.dynamicLoad(id);
      }
    });
  }

  private static initializeDiceBotQueue(): PromiseQueue {
    const queue = new PromiseQueue('DiceBotQueue');
    queue.add(async () => {
      DiceBot.loader = new StaticLoader();
      DiceBot.diceBotInfos = DiceBot.listAvailableGameSystems().sort((a, b) => {
        if (a.sortKey < b.sortKey) return -1;
        if (a.sortKey > b.sortKey) return 1;
        return 0;
      });
    });
    return queue;
  }

  getDiceTables(): DiceTable[] {
    return ObjectStore.instance.getObjects(DiceTable);
  }

  static deleteMyselfResourceBuff(str: string): string {
    let beforeIsSpace = true;
    let beforeIsT = false;
    let tCommand = false;
    let deleteCommand = false;
    let str2 = '';
    for (let i = 0; i < str.length; i++) {
      const chktext: string = str[i];

      if (beforeIsSpace && chktext.match(/[tTｔＴ]/)) {
        beforeIsSpace = false;
        beforeIsT = true;
        deleteCommand = false;
        tCommand = false;
        str2 = str2 + str[i];
        continue;
      }

      if (beforeIsT && chktext.match(/[:：&＆]/)) {
        beforeIsSpace = false;
        beforeIsT = false;
        deleteCommand = false;
        tCommand = true;
        str2 = str2 + str[i];
        continue;
      }

      if ((tCommand || beforeIsSpace || deleteCommand) && chktext.match(/[:：&＆]/)) {
        beforeIsSpace = false;
        beforeIsT = false;
        deleteCommand = true;
        tCommand = false;
        continue;
      }

      if (chktext.match(/\s/)) {
        beforeIsSpace = true;
        beforeIsT = false;
        deleteCommand = false;
        tCommand = false;
        str2 = str2 + str[i];
        continue;
      } else {
        beforeIsSpace = false;
      }

      if (deleteCommand) {
        continue;
      }

      str2 = str2 + str[i];
    }
    return str2;
  }

  // リソース操作コマンドでs付きがあるか判定
  checkSecretEditCommand(chatText: string): boolean {
    const text: string = ' ' + toHalfWidth(chatText).toLowerCase();
    const replaceText = text.replace('：', ':');
    const m = replaceText.match(/\sST?:/i);
    if (m) return true;
    return false;
  }

  // 繰り返しコマンドを除去し、sより後ろがCOMMAND_PATTERNにマッチするか確認
  checkSecretDiceCommand(gameSystem: GameSystemClass, chatText: string): boolean {
    const text: string = toHalfWidth(chatText).toLowerCase();
    const nonRepeatText = text
      .replace(/^(\d+)?\s+/, 'repeat1 ')
      .replace(/^x(\d+)?\s+/, 'repeat1 ')
      .replace(/repeat(\d+)?\s+/, '');
    const regArray = /^s(.*)?/gi.exec(nonRepeatText);
    if (gameSystem.COMMAND_PATTERN) {
      return !!(regArray && gameSystem.COMMAND_PATTERN.test(regArray[1]));
    }
    return false;
  }

  // GameObject Lifecycle
  onStoreAdded() {
    super.onStoreAdded();
    EventSystem.register(this)
      .on('SEND_MESSAGE', async (event) => {
        const chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || chatMessage.isSystem) {
          return;
        }

        let text: string;
        if (event.data.messageTrget) {
          text = toHalfWidth(event.data.messageTrget.text);
        } else {
          text = toHalfWidth(chatMessage.text);
        }

        const gameType: string = chatMessage.tags ? chatMessage.tags[0] : '';

        try {
          const regArray = /^((\d+)?\s+)?(.*)?/gi.exec(text);
          const repeat: number = regArray![2] != null ? Number(regArray![2]) : 1;
          let rollText: string = regArray![3] != null ? regArray![3] : text;
          const gameSystem = await DiceBot.loadGameSystemAsync(gameType);
          if (gameSystem.COMMAND_PATTERN) {
            if (!gameSystem.COMMAND_PATTERN.test(rollText)) {
              return;
            }
          }
          if (!rollText || repeat < 1) {
            return;
          }

          // 繰り返しコマンドに変換
          if (repeat > 1) {
            rollText = `x${repeat} ${rollText}`;
          }

          const rollResult = await DiceBot.diceRollAsync(rollText, gameSystem);
          if (!rollResult.result) {
            return;
          }

          if (event.data.messageTrget) {
            if (event.data.messageTrget.object) {
              this.sendResultMessage(rollResult, chatMessage, ' [' + event.data.messageTrget.object.name + ']');
            } else {
              this.sendResultMessage(rollResult, chatMessage);
            }
          } else {
            this.sendResultMessage(rollResult, chatMessage);
          }
        } catch (e) {
          Logger.error('[DiceBot] ダイスコマンド処理エラー', e);
        }
        return;
      })
      .on('DICE_TABLE_MESSAGE', async (event) => {
        const chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || chatMessage.isSystem) {
          return;
        }

        const text: string = toHalfWidth(chatMessage.text).trim();
        const splitText = text.split(/\s/);

        const diceTable = this.getDiceTables();
        if (!diceTable) {
          return;
        }
        if (splitText.length == 0) {
          return;
        }

        let rollTable: DiceTable | null = null;
        for (const table of diceTable) {
          if (table.command == splitText[0]) {
            rollTable = table;
          }
        }
        if (!rollTable) {
          return;
        }

        try {
          const regArray = /^((\d+)?\s+)?(.*)?/gi.exec(rollTable.dice);
          const repeat: number = regArray![2] != null ? Number(regArray![2]) : 1;
          const rollText: string = regArray![3] != null ? regArray![3] : text;
          const finalResult: DiceRollResult = { id: null, result: '', isSecret: false };
          for (let i = 0; i < repeat && i < 32; i++) {
            const gameSystem = await DiceBot.loadGameSystemAsync(rollTable.diceTablePalette.dicebot);
            const rollResult = await DiceBot.diceRollAsync(rollText, gameSystem);
            if (rollResult.result.length < 1) {
              break;
            }

            finalResult.result += rollResult.result;
            finalResult.isSecret = finalResult.isSecret || rollResult.isSecret;
            if (1 < repeat) {
              finalResult.result += ` #${i + 1}`;
            }
          }

          const rolledDiceNum = finalResult.result.match(/\d+$/);
          let tableAns = 'ダイス目の番号が表にありません';
          if (rolledDiceNum) {
            const tablePalette = rollTable.diceTablePalette.getPalette();
            for (const i in tablePalette) {
              const splitOneTable = tablePalette[i].split(/[:：,，\s]/);
              if (splitOneTable[0] == rolledDiceNum[0]) {
                tableAns = tablePalette[i].replace(/\\n/g, '\n');
              }
            }
          }
          finalResult.result += '\n' + tableAns;
          this.sendResultMessage(finalResult, chatMessage);
        } catch (e) {
          Logger.error('[DiceBot] ダイス表処理エラー', e);
        }
        return;
      })
      .on<{ messageIdentifier: string; messageTargetContext: ChatMessageTargetContext[] | null }>(
        'RESOURCE_EDIT_MESSAGE',
        async (event) => {
          const chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
          if (!chatMessage || !chatMessage.isSendFromSelf || chatMessage.isSystem) {
            return;
          }

          this.checkResourceEditCommand(
            chatMessage,
            event.data.messageTargetContext ? event.data.messageTargetContext : []
          );
          return;
        }
      );
  }

  private targeted(gameCharacter: GameCharacter): boolean {
    return gameCharacter.targeted;
  }

  private targetedGameCharacterList(): GameCharacter[] {
    const objects = ObjectStore.instance
      .getObjects<GameCharacter>(GameCharacter)
      .filter((character) => this.targeted(character));
    return objects;
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

  private checkResourceEditCommand(originalMessage: ChatMessage, messageTargetContext: ChatMessageTargetContext[]) {
    const resourceByCharacter: ResourceByCharacter[] = [];
    const buffByCharacter: BuffByCharacter[] = [];

    const sendFromObject: GameCharacter = this.messageSendGameCharacter(originalMessage.sendFrom);
    let isSecret = false;

    for (const oneMessageTargetContext of messageTargetContext) {
      const text = ' ' + oneMessageTargetContext.text;
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
            const resByCharacter: ResourceByCharacter = {
              resourceCommand: '',
              object: null!,
            };
            resByCharacter.resourceCommand = res;
            resByCharacter.object = oneMessageTargetContext.object!;
            resourceByCharacter.push(resByCharacter);
          }
        }
        if (resultBuff) {
          for (const buff of resultBuff) {
            const bByCharacter: BuffByCharacter = {
              buffCommand: '',
              object: null!,
            };
            bByCharacter.buffCommand = buff;
            bByCharacter.object = oneMessageTargetContext.object!;
            buffByCharacter.push(bByCharacter);
          }
        }
      }
    }
    this.resourceEditProcess(sendFromObject, resourceByCharacter, buffByCharacter, originalMessage, isSecret);
  }

  resourceEditParseOption(text: string): ResourceEditOption {
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

  private resourceCommandToEdit(
    oneResourceEdit: ResourceEdit,
    text: string,
    object: GameCharacter,
    targeted: boolean
  ): boolean {
    oneResourceEdit.object = object;
    oneResourceEdit.targeted = targeted;
    const replaceText =
      ' ' + text.replace('：', ':').replace('＋', '+').replace('－', '-').replace('＝', '=').replace('＞', '>');

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
    oneResourceEdit.operator = reg2; // 演算符号

    if (object.chkChangeStatusName(reg1)) {
      oneResourceEdit.target = reg1; // 操作対象検索文字タイプ生値
    } else if (object.chkChangeStatusName(reg1HalfWidth)) {
      oneResourceEdit.target = reg1HalfWidth; // 操作対象検索文字半角化
    } else {
      return false; // 対象なし実行失敗
    }

    if (oneResourceEdit.operator == '>') {
      oneResourceEdit.replace = resourceEditResult![3];
    } else {
      let reg3: string = resourceEditResult![3].replace(/[A-CE-ZＡ-ＣＥ-Ｚ]+$/i, '');
      const commandPrefix = oneResourceEdit.operator == '-' ? '-' : '';
      oneResourceEdit.command = commandPrefix + toHalfWidth(reg3) + '+(1d1-1)';
      // 操作量C()とダイスロールが必要な場合分けをしないために+(1d1-1)を付加してダイスロール命令にしている

      reg3 = reg3.replace(/[A-CE-ZＡ-ＣＥ-Ｚ]+$/i, '');

      const optionCommand = this.resourceEditParseOption(resourceEditResult![3]);
      if (optionCommand.isErr) {
        return false; // 実行失敗
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
    const oneResourceEdit: ResourceEdit = {
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
    return oneResourceEdit;
  }

  async resourceEditProcess(
    sendFromObject: GameCharacter,
    resourceByCharacter: ResourceByCharacter[],
    buffByCharacter: BuffByCharacter[],
    originalMessage: ChatMessage,
    isSecret: boolean
  ) {
    const allEditList: ResourceEdit[] = [];
    const gameSystem = await DiceBot.loadGameSystemAsync(originalMessage.tags ? originalMessage.tags[0] : '');

    for (const res of resourceByCharacter) {
      const oneText = res.resourceCommand;
      const targeted = oneText.match(/^t:/i) ? true : false;
      let obj: GameCharacter;
      if (targeted) {
        const object = res.object;
        const oneResourceEdit: ResourceEdit = this.defaultResourceEdit();
        if (!this.resourceCommandToEdit(oneResourceEdit, oneText, object, targeted)) return;
        if (oneResourceEdit.operator != '>') {
          // ダイスロール及び四則演算
          try {
            const rollResult = await DiceBot.diceRollAsync(oneResourceEdit.command, gameSystem);
            if (!rollResult.result) {
              return null!;
            }
            const splitResult = rollResult.result.split(' ＞ ');
            oneResourceEdit.diceResult = splitResult[splitResult.length - 2].replace(/\+\(1\[1\]-1\)$/, '');
            const resultMatch = rollResult.result.match(/([-+]?\d+)$/); // 計算結果だけ格納
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
          const oneResourceEdit: ResourceEdit = this.defaultResourceEdit();
          if (!this.resourceCommandToEdit(oneResourceEdit, oneText, obj, targeted)) return;
          if (oneResourceEdit.operator != '>') {
            // ダイスロール及び四則演算
            try {
              const rollResult = await DiceBot.diceRollAsync(oneResourceEdit.command, gameSystem);
              if (!rollResult.result) {
                return null!;
              }
              const splitResult = rollResult.result.split(' ＞ ');
              oneResourceEdit.diceResult = splitResult[splitResult.length - 2].replace(/\+\(1\[1\]-1\)$/, '');
              const resultMatch = rollResult.result.match(/([-+]?\d+)$/); // 計算結果だけ格納
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
        const oneBuffEdit: BuffEdit = {
          command: replaceText,
          object: object,
          targeted: targeted,
        };
        repBuffCommandList.push(oneBuffEdit);
      } else {
        if (sendFromObject == null) {
          Logger.debug('[DiceBot] 送信元がキャラクターではないためバフ操作不可');
          return;
        } else {
          const replaceText = oneText.replace('＆', '&').replace(/＋$/, '+').replace(/－$/, '-');
          const oneBuffEdit: BuffEdit = {
            command: replaceText,
            object: sendFromObject,
            targeted: targeted,
          };
          repBuffCommandList.push(oneBuffEdit);
        }
      }
    }

    this.resourceBuffEdit(allEditList, repBuffCommandList, originalMessage, isSecret);
    return;
  }

  private resourceTextEdit(edit: ResourceEdit, character: GameCharacter): string {
    character.setStatusText(edit.target, edit.replace);
    const ansText = edit.target + '＞' + edit.replace + '    ';
    return ansText;
  }

  private resourceEdit(edit: ResourceEdit, character: GameCharacter): string {
    let optionText = '';
    let oldNum: number;
    let newNum: number;
    let nowOrMax = edit.nowOrMax;

    const maxNum = character.getStatusValue(edit.target, 'max');
    if (nowOrMax == 'max' && maxNum == null) {
      nowOrMax = 'now';
    }
    if (nowOrMax == 'now') {
      oldNum = character.getStatusValue(edit.target, 'now');
    } else {
      oldNum = character.getStatusValue(edit.target, 'max');
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
      character.setStatusValue(edit.target, 'now', newNum);
    } else {
      character.setStatusValue(edit.target, 'max', newNum);
    }

    const operatorText = edit.operator == '-' ? '' : edit.operator;
    const changeMax = nowOrMax == 'max' ? '(最大値)' : '';
    const ansText =
      edit.target + changeMax + ':' + oldNum + operatorText + edit.diceResult + '＞' + newNum + optionText + '    ';
    return ansText;
  }

  private buffEdit(buff: BuffEdit, character: GameCharacter): string {
    const command = buff.command;
    let text = '';
    if (buff.targeted) {
      text += '[' + character.name + '] ';
    }
    if (command.match(/^[tTｔＴ]?&[RＲrｒ]-$/i)) {
      character.decreaseBuffRound();
      text += 'バフRを減少';
      text += '    ';
    } else if (command.match(/^[tTｔＴ]?&[RＲrｒ][+]$/i)) {
      character.increaseBuffRound();
      text += 'バフRを増加';
      text += '    ';
    } else if (command.match(/^[tTｔＴ]?&[DＤdｄ]$/i)) {
      character.deleteZeroRoundBuff();
      text += '0R以下のバフを消去';
      text += '    ';
    } else if (command.match(/^[tTｔＴ]?&.+-$/i)) {
      const match = command.match(/^[tTｔＴ]?&(.+)-$/i);
      const reg1 = match![1];
      if (character.deleteBuff(reg1)) {
        text += reg1 + 'を消去';
        text += '    ';
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
        bufftext = bufftext + '/' + splittext[1];
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
        bufftext = bufftext + '/' + round + 'R';
      }

      character.addBuffRound(buffname, sub, round);
      text += 'バフを付与 ' + bufftext;
      text += '    ';
    }
    return text;
  }

  private resourceBuffEdit(
    allEditList: ResourceEdit[],
    buffList: BuffEdit[],
    originalMessage: ChatMessage,
    isSecret: boolean
  ) {
    let text = '';
    // リソース処理
    let isDiceRoll = false;
    let character: GameCharacter;
    for (const edit of allEditList) {
      character = edit.object;
      if (edit.targeted) {
        text += '[' + character.name + '] ';
      }
      if (edit.operator == '>') {
        text += this.resourceTextEdit(edit, character);
      } else {
        text += this.resourceEdit(edit, character);
      }
      if (edit.isDiceRoll) {
        isDiceRoll = true;
      }
    }
    // バフ処理
    for (const buff of buffList) {
      character = buff.object;
      text += this.buffEdit(buff, character);
    }
    text = text.replace(/\s\s\s\s$/, '');

    if (text == '') return;
    let fromText;
    let nameText;
    if (isDiceRoll) {
      fromText = 'System-BCDice';
      nameText = '<BCDice：' + originalMessage.name + '>';
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

  private sendResultMessage(rollResult: DiceRollResult, originalMessage: ChatMessage, multiTargetOption?: string) {
    let result: string = rollResult.result;
    const isSecret: boolean = rollResult.isSecret;

    if (result.length < 1) {
      return;
    }
    result = result.replace(/[＞]/g, (_s) => '→').trim();

    const diceBotMessage: ChatMessageContext = {
      identifier: '',
      tabIdentifier: originalMessage.tabIdentifier,
      originFrom: originalMessage.from,
      from: 'System-BCDice',
      timestamp: originalMessage.timestamp + 1,
      imageIdentifier: PeerCursor.myCursor.diceImageIdentifier,
      tag: isSecret ? 'system secret' : 'system',
      name: isSecret ? '<Secret-BCDice：' + originalMessage.name + '>' : '<BCDice：' + originalMessage.name + '>',
      text: multiTargetOption ? result + multiTargetOption : result,
      messColor: originalMessage.messColor,
    };

    if (originalMessage.to != null && 0 < originalMessage.to.length) {
      diceBotMessage.to = originalMessage.to;
      if (originalMessage.to.indexOf(originalMessage.from) < 0) {
        diceBotMessage.to += ' ' + originalMessage.from;
      }
    }
    const chatTab = ObjectStore.instance.get<ChatTab>(originalMessage.tabIdentifier);
    if (chatTab) {
      chatTab.addMessage(diceBotMessage);
    }
  }

  // GameObject Lifecycle
  onStoreRemoved() {
    super.onStoreRemoved();
    EventSystem.unregister(this);
  }
}
