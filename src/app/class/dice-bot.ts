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

import { PeerCursor } from './peer-cursor';

import KariDice from './KariDice';
import IdoDice from './IdoDice';
// 追加カスタムダイスは下記追記
// import *** from './***';

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
    diceBotInfos.push(this.getCustomGameSystemInfo(KariDice as GameSystemClass, 'ja_jp'));
    diceBotInfos.push(this.getCustomGameSystemInfo(IdoDice as GameSystemClass, 'ja_jp'));
    // 追加カスタムダイスは下記追記
    // diceBotInfos.push( getCustomGameSystemInfo( *** ));
    return diceBotInfos;
  }

  static async diceRollAsync(message: string, gameSystem: GameSystemClass): Promise<DiceRollResult> {
    return DiceBot.queue.add(() => {
      try {
        const result = gameSystem.eval(message);
        if (result) {
          console.log('diceRoll!!!', result.text);
          console.log('isSecret!!!', result.secret);
          return {
            id: gameSystem.ID,
            result: `${gameSystem.ID} : ${result.text}`.replace(/\n?(#\d+)\n/gi, '$1 '), // 繰り返しダイスロールは改行表示を短縮する
            isSecret: result.secret,
          };
        }
      } catch (e) {
        console.error(e);
      }
      return { id: gameSystem.ID, result: '', isSecret: false };
    });
  }

  static async getHelpMessage(gameType: string): Promise<string> {
    try {
      const gameSystem = await DiceBot.loadGameSystemAsync(gameType);
      return gameSystem.HELP_MESSAGE;
    } catch (e) {
      console.error(e);
    }
    return '';
  }

  static loadCustomGameSystem(gameType: string): GameSystemClass | null {
    if (gameType == 'KariDice') {
      return KariDice;
    }
    if (gameType == 'IdoDice') {
      return IdoDice;
    }
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
        console.log('sendChat文字置換' + 'match(/[tTｔＴ]/)');
        str2 = str2 + str[i];
        continue;
      }

      if (beforeIsT && chktext.match(/[:：&＆]/)) {
        beforeIsSpace = false;
        beforeIsT = false;
        deleteCommand = false;
        tCommand = true;
        console.log('sendChat文字置換' + 'match(/[:：&＆]/)');
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
        console.log('sendChat文字置換' + 'match(/\\s/)');
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
    console.log(m);
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
    console.log('checkSecretDiceCommand:' + chatText + ' gameSystem.name:' + gameSystem.name);

    if (gameSystem.COMMAND_PATTERN) {
      return !!(regArray && gameSystem.COMMAND_PATTERN.test(regArray[1]));
    }
    console.log('checkSecretDiceCommand:' + false);
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
          console.log('SEND_MESSAGE gameType :' + gameType);
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
          console.error(e);
        }
        return;
      })
      .on('DICE_TABLE_MESSAGE', async (event) => {
        console.log('ダイス表判定');

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

        console.log('コマンド候補:' + splitText[0]);

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
            console.log('rolledDiceNum:' + rolledDiceNum[0]);

            const tablePalette = rollTable.diceTablePalette.getPalette();
            console.log('tablePalette:' + tablePalette);
            for (const i in tablePalette) {
              console.log('oneTable:' + tablePalette[i]);

              const splitOneTable = tablePalette[i].split(/[:：,，\s]/);
              if (splitOneTable[0] == rolledDiceNum[0]) {
                tableAns = tablePalette[i].replace(/\\n/g, '\n');
              }
            }
          }
          finalResult.result += '\n' + tableAns;
          this.sendResultMessage(finalResult, chatMessage);
        } catch (e) {
          console.error(e);
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

          console.log('リソース操作判定');
          this.checkResourceEditCommand(
            chatMessage,
            event.data.messageTargetContext ? event.data.messageTargetContext : []
          );
          return;
        }
      )

      // ダイスからぶりによる擬似的なダイス交換を行う
      //
      // 注※
      // 空振り処理は実装しているが
      // 数学上　実行によって実行後の判定の成功率やダイスの偏りに影響は及ぼさない
      //
      // コードを実装した円柱は、採用しているユドナリウムリリィのダイスの乱数発生器にχ二乗検定による統計的検証は行い、
      // 乱数性質に問題がないことは確認、理解した上で作っている
      // あくまで
      // 『ダイスを交換したり　悪い出目が偶然続いたときに　ダイスを空振りしてお祓いをしたくなる　今日のダイスは偏っている気がする』など
      // 人間の心理をターゲートとしたコマンドである
      //
      // このコマンドでダイスロール時に表示されるアイコンが変更されるがこれは視覚上演出であり
      // 空振りした回数やダイスの乱数とは無関係に差し替えている
      //
      // 別のオンラインセッションツールの「どどんとふむせる」のまそっぷ機能のオマージュであり(細部実装は異なる)
      //
      // 性質上　2021年エイプリールフールコマンドとして実装した
      // 実装意図はユーモアであることを記しておく

      .on('APRIL_MESSAGE', async (event) => {
        const chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || chatMessage.isSystem) {
          return;
        }

        const text: string = toHalfWidth(chatMessage.text);
        const splitText = text.split(/\s/);
        const gameSystem = await DiceBot.loadGameSystemAsync(chatMessage.tags ? chatMessage.tags[0] : '');

        const diceTable = this.getDiceTables();
        if (!diceTable) {
          return;
        }
        if (splitText.length == 0) {
          return;
        }

        if (splitText[0] == '#まそっぷ' || splitText[0] == '#エイプリル') {
          setTimeout(() => {
            this.alertAprilMessage(chatMessage);
          }, 10);
          return;
        }
        if (splitText[0] != '#えいぷりる') {
          return;
        }

        console.log('えいぷりる実行:' + splitText[0] + ':' + splitText[1] + ':' + splitText.length);

        let diceType = '2d6';
        let rollDiceType = 'd6';

        if (splitText.length >= 2) {
          const chkType = splitText[1].toLowerCase();
          if (chkType == '1d4' || chkType == '4') {
            diceType = '1d4';
            rollDiceType = 'd4';
          }
          if (chkType == '1d6' || chkType == '6') {
            diceType = '1d6';
            rollDiceType = 'd6';
          }
          if (chkType == '2d6') {
            diceType = '2d6';
            rollDiceType = 'd6';
          }
          if (chkType == '1d8' || chkType == '8') {
            diceType = '1d8';
            rollDiceType = 'd8';
          }
          if (chkType == '1d10' || chkType == '10') {
            diceType = '1d10';
            rollDiceType = 'd10';
          }
          if (chkType == '1d12' || chkType == '12') {
            diceType = '1d12';
            rollDiceType = 'd12';
          }
          if (chkType == '1d20' || chkType == '20') {
            diceType = '1d20';
            rollDiceType = 'd20';
          }
          if (chkType == '1d100' || chkType == '100') {
            diceType = '1d100';
            rollDiceType = 'd100';
          }
          if (chkType == '0') {
            diceType = '';
          }
        }

        console.log('えいぷりる ダイスタイプ:' + diceType);

        const nowDiceImageIndex = PeerCursor.myCursor.diceImageIndex;
        let newDiceImageIndex: number;

        const imageIndexMax = 3;
        if (nowDiceImageIndex < 0) {
          // 画像のランダム決定は標準乱数つかう
          newDiceImageIndex = Math.floor(Math.random() * (imageIndexMax + 1));
        } else {
          newDiceImageIndex = Math.floor(Math.random() * imageIndexMax);
          if (nowDiceImageIndex <= newDiceImageIndex) {
            newDiceImageIndex++;
          }
        }

        PeerCursor.myCursor.diceImageType = diceType;
        if (diceType == '') {
          PeerCursor.myCursor.diceImageIndex = -1;
          setTimeout(() => {
            this.unDispDiceAprilMessage(chatMessage);
          }, 10);
          return;
        } else {
          PeerCursor.myCursor.diceImageIndex = newDiceImageIndex;
        }

        const changeFate0 = 100;

        let changeFate1 = Math.floor(Math.random() * 100) + 1; // 一度のロール量上限100による
        if (changeFate1 < 1) {
          changeFate1 = 1;
        }
        if (changeFate1 > 100) {
          changeFate1 = 100;
        }

        let changeFate2 = Math.floor(Math.random() * 100) + 1; // 一度のロール量上限100による
        if (changeFate2 < 1) {
          changeFate2 = 1;
        }
        if (changeFate2 > 100) {
          changeFate2 = 100;
        }

        let aprilRollDice: string;

        if (diceType == '2d6') {
          aprilRollDice =
            changeFate0 +
            rollDiceType +
            '+' +
            changeFate0 +
            rollDiceType +
            '+' +
            changeFate1 +
            rollDiceType +
            '+' +
            changeFate1 +
            rollDiceType +
            '+' +
            changeFate2 +
            rollDiceType +
            '+' +
            changeFate2 +
            rollDiceType;
        } else {
          aprilRollDice =
            changeFate0 + rollDiceType + '+' + changeFate1 + rollDiceType + '+' + changeFate2 + rollDiceType;
        }
        try {
          const regArray = /^((\d+)?\s+)?([^\s]*)?/gi.exec(aprilRollDice);
          const rollText: string = regArray![3] != null ? regArray![3] : text;

          const rollResult = await DiceBot.diceRollAsync(rollText, gameSystem);
          if (!rollResult.result) {
            return;
          }

          this.sendAprilMessage(rollResult, changeFate0 + changeFate1 + changeFate2, chatMessage);
        } catch (e) {
          console.error(e);
        }

        return;
      });
  }

  private alertAprilMessage(originalMessage: ChatMessage) {
    const text = '「ちゃんと『#えいぷりる』ってよんでください！ダイス運下げますよっ！？」';

    const aprilMessage: ChatMessageContext = {
      identifier: '',
      tabIdentifier: originalMessage.tabIdentifier,
      originFrom: originalMessage.from,
      from: 'System',
      timestamp: originalMessage.timestamp + 1,
      imageIdentifier: 'april[01]',
      tag: 'system',
      name: '<えいぷりる>',
      text,
      messColor: originalMessage.messColor,
      imagePos: originalMessage.imagePos ? originalMessage.imagePos : undefined,
    };

    const chatTab = ObjectStore.instance.get<ChatTab>(originalMessage.tabIdentifier);
    if (chatTab) {
      chatTab.addMessage(aprilMessage);
    }
  }

  private unDispDiceAprilMessage(originalMessage: ChatMessage) {
    const text = 'ダイス画像をデフォルト(非表示)にしました';

    const aprilMessage: ChatMessageContext = {
      identifier: '',
      tabIdentifier: originalMessage.tabIdentifier,
      originFrom: originalMessage.from,
      from: 'System',
      timestamp: originalMessage.timestamp + 1,
      imageIdentifier: 'april[00]',
      tag: 'system',
      name: '<えいぷりる>',
      text,
      messColor: originalMessage.messColor,
    };

    const chatTab = ObjectStore.instance.get<ChatTab>(originalMessage.tabIdentifier);
    if (chatTab) {
      chatTab.addMessage(aprilMessage);
    }
  }

  private sendAprilMessage(rollResult: DiceRollResult, roollNum: number, originalMessage: ChatMessage) {
    const result: string = rollResult.result;

    if (result.length < 1) {
      return;
    }
    console.log('result.length:' + result.length);

    const totalFate = result.match(/\d+$/);
    const text =
      '「まそっぷ！」えいぷりるは炎の剣で ' +
      roollNum +
      ' 連続でダイスを突いた → ' +
      totalFate +
      ' 運命が変わったかもしれない';

    const diceBotMessage: ChatMessageContext = {
      identifier: '',
      tabIdentifier: originalMessage.tabIdentifier,
      originFrom: originalMessage.from,
      from: 'System-BCDice',
      timestamp: originalMessage.timestamp + 1,
      imageIdentifier: 'april[00]',
      tag: 'system',
      name: '<BCDice：' + 'えいぷりる' + '>',
      text,
      messColor: originalMessage.messColor,
      imagePos: originalMessage.imagePos ? originalMessage.imagePos : undefined,
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
      console.log('キャラクタからの発信じゃありません');
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
        console.log('chktxt=' + chktxt);
        if (chktxt.match(/^(t?[:&][^:：&＆])+/gi)) {
          //正常。処理無し
        } else {
          continue;
        }

        const resultRes = chktxt.match(/t?:[^:：&＆]+/gi);
        const resultBuff = chktxt.match(/t?&[^:：&＆]+/gi);

        if (resultRes) {
          for (const res of resultRes) {
            console.log(res);
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
    console.log('リソース変更コマンド処理開始');
    //    console.log(object.name);
    oneResourceEdit.object = object;
    oneResourceEdit.targeted = targeted;
    const replaceText =
      ' ' + text.replace('：', ':').replace('＋', '+').replace('－', '-').replace('＝', '=').replace('＞', '>');

    console.log('リソース変更：' + replaceText);
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

      console.log(reg1 + '/' + reg2 + '/' + reg3);
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

    console.log('resourceEditProcess');
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
            console.error(e);
          }
        }
        allEditList.push(oneResourceEdit);
      } else {
        if (sendFromObject == null) {
          console.log('キャラクターでないリソースは操作できません');
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
              console.error(e);
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
          console.log('キャラクターでないものに対してバフ操作はできません');
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
      console.log('match' + match);
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
    console.log('result.length:' + result.length);
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
