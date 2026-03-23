import { inject, Injectable } from '@angular/core';
import { Card } from '@axe/class/card';
import { CardStack } from '@axe/class/card-stack';
import { CharacterTemplateFactory } from '@axe/class/character-template-factory';
import { ImageContext, ImageFile } from '@axe/class/core/file-storage/image-file';
import { ImageStorage } from '@axe/class/core/file-storage/image-storage';
import { EventSystem } from '@axe/class/core/system';
import { DataElement } from '@axe/class/data-element';
import { DiceSymbol, DiceType } from '@axe/class/dice-symbol';
import { GameCharacter } from '@axe/class/game-character';
import { GameTable } from '@axe/class/game-table';
import { GameTableMask } from '@axe/class/game-table-mask';
import { GameTableScratchMask } from '@axe/class/game-table-scratch-mask';
import { ImageTag } from '@axe/class/image-tag';
import { RangeArea } from '@axe/class/range';
import { PresetSound, SoundEffect } from '@axe/class/sound-effect';
import { TableSelecter } from '@axe/class/table-selecter';
import { Terrain } from '@axe/class/terrain';
import { TextNote } from '@axe/class/text-note';

import { ContextMenuAction } from './context-menu.service';
import { PointerCoordinate } from './pointer-device.service';

@Injectable({
  providedIn: 'root',
})
export class TabletopActionService {
  private imageStorage = inject(ImageStorage);
  private tableSelecter = inject(TableSelecter);

  constructor() {}

  createGameCharacter(position: PointerCoordinate): GameCharacter {
    const character = GameCharacter.create('新しいキャラクター', 1, '');
    character.location.x = position.x - 25;
    character.location.y = position.y - 25;
    character.posZ = position.z;
    return character;
  }

  createGameTableMask(position: PointerCoordinate): GameTableMask | undefined {
    const viewTable = this.getViewTable();
    if (!viewTable) return undefined;

    const tableMask = GameTableMask.create('マップマスク', 5, 5, 100);
    tableMask.location.x = position.x - 25;
    tableMask.location.y = position.y - 25;
    tableMask.posZ = position.z;

    viewTable.appendChild(tableMask);
    return tableMask;
  }

  createGameTableScratchMask(position: PointerCoordinate): GameTableScratchMask | undefined {
    const viewTable = this.getViewTable();
    if (!viewTable) return undefined;

    const tableMask = GameTableScratchMask.create('スクラッチマスク', 10, 10, 100);
    tableMask.location.x = position.x - 25;
    tableMask.location.y = position.y - 25;
    tableMask.posZ = position.z;

    viewTable.appendChild(tableMask);
    return tableMask;
  }

  createTerrain(position: PointerCoordinate): Terrain | undefined {
    const url: string = './assets/images/tex.jpg';
    let image: ImageFile = this.imageStorage.get(url);
    //本家PR #92より
    //    if (!image) image = this.imageStorage.add(url);
    if (!image) {
      image = this.imageStorage.add(url);
      ImageTag.create(image.identifier).tag = '地形';
    }
    //
    const viewTable = this.getViewTable();
    if (!viewTable) return undefined;

    const terrain = Terrain.create('地形', 2, 2, 2, image.identifier, image.identifier);
    terrain.location.x = position.x - 50;
    terrain.location.y = position.y - 50;
    terrain.posZ = position.z;

    viewTable.appendChild(terrain);
    return terrain;
  }

  createTextNote(position: PointerCoordinate): TextNote {
    const textNote = TextNote.create('共有メモ', 'テキストを入力してください', 5, 4, 3);
    textNote.location.x = position.x;
    textNote.location.y = position.y;
    textNote.posZ = position.z;
    return textNote;
  }

  createDiceSymbol(position: PointerCoordinate, name: string, diceType: DiceType, imagePathPrefix: string): DiceSymbol {
    const diceSymbol = DiceSymbol.create(name, diceType, 1);
    let image: ImageFile = null!;

    diceSymbol.faces.forEach((face) => {
      const url: string = `./assets/images/dice/${imagePathPrefix}/${imagePathPrefix}[${face}].png`;
      image = this.imageStorage.get(url);
      if (!image) {
        image = this.imageStorage.add(url);
      }
      diceSymbol.imageDataElement.getFirstElementByName(face).value = image.identifier;
    });

    diceSymbol.location.x = position.x - 25;
    diceSymbol.location.y = position.y - 25;
    diceSymbol.posZ = position.z;
    return diceSymbol;
  }

  createRangeArea(position: PointerCoordinate, typeName: string): RangeArea {
    let range;
    switch (typeName) {
      case 'LINE':
        range = RangeArea.create('射程範囲', 1, 10, 100);
        break;
      case 'CIRCLE':
        range = RangeArea.create('射程範囲', 6, 6, 100);
        break;
      case 'SQUARE':
        range = RangeArea.create('射程範囲', 6, 6, 100);
        break;
      case 'DIAMOND':
        range = RangeArea.create('射程範囲', 6, 6, 100);
        break;
      case 'CORN':
      default:
        range = RangeArea.create('射程範囲', 5, 5, 100);
        break;
    }

    range.location.x = position.x;
    range.location.y = position.y;
    range.posZ = position.z;
    range.type = typeName;
    const data = range.commonDataElement.getFirstElementByName('opacity');
    data.currentValue = 60;
    return range;
  }

  createTrump(position: PointerCoordinate): CardStack {
    const cardStack = CardStack.create('トランプ山札');
    cardStack.location.x = position.x - 25;
    cardStack.location.y = position.y - 25;
    cardStack.posZ = position.z;

    const back: string = './assets/images/trump/z02.gif';
    //本家PR #92より
    //    if (!this.imageStorage.get(back)) {
    //      this.imageStorage.add(back);
    //    }
    if (!this.imageStorage.get(back)) {
      const image = this.imageStorage.add(back);
      ImageTag.create(image.identifier).tag = 'トランプ';
    }
    //
    const suits: string[] = ['c', 'd', 'h', 's'];
    const trumps: string[] = [];

    for (const suit of suits) {
      for (let i = 1; i <= 13; i++) {
        trumps.push(suit + ('00' + i).slice(-2));
      }
    }

    trumps.push('x01');
    trumps.push('x02');

    for (const trump of trumps) {
      const url: string = './assets/images/trump/' + trump + '.gif';
      if (!this.imageStorage.get(url)) {
        //本家PR #92より
        //          this.imageStorage.add(url);
        const image = this.imageStorage.add(url);
        ImageTag.create(image.identifier).tag = 'トランプ';
        //
      }
      const card = Card.create('カード', url, back);
      cardStack.putOnBottom(card);
    }
    return cardStack;
  }

  makeDefaultTable() {
    const tableSelecter = new TableSelecter('tableSelecter');
    tableSelecter.initialize();

    const gameTable = new GameTable('gameTable');
    const bgFileContext = ImageFile.createEmpty('testTableBackgroundImage_image').toContext();
    bgFileContext.url = './assets/images/BG10a_80.jpg';
    const testBgFile = this.imageStorage.add(bgFileContext);
    ImageTag.create(testBgFile.identifier).tag = '背景';
    gameTable.name = '最初のテーブル';
    gameTable.imageIdentifier = testBgFile.identifier;
    gameTable.width = 20;
    gameTable.height = 15;
    gameTable.initialize();

    tableSelecter.viewTableIdentifier = gameTable.identifier;
  }

  // バフ追加identifierを固定にするため初期キャラのバフはGameCharacterでやらずにここでやる
  addBuffRound(character: GameCharacter, name: string, subcom: string, round: number) {
    if (character.buffDataElement.children) {
      for (const dataElm of character.buffDataElement.children) {
        dataElm.appendChild(
          DataElement.create(
            name,
            round,
            { type: 'numberResource', currentValue: subcom },
            name + '_' + character.identifier
          )
        );
        return;
      }
    }
  }

  initAprilDiceImage() {
    let file: ImageFile;
    let fileContext: ImageContext;

    fileContext = ImageFile.createEmpty('1d4_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d4_dice[00].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d4_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d4_dice[01].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d4_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d4_dice[02].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d4_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d4_dice[03].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d6_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d6_dice[00].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d6_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d6_dice[01].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d6_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d6_dice[02].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d6_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d6_dice[03].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('2d6_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/2d6_dice[00].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('2d6_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/2d6_dice[01].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('2d6_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/2d6_dice[02].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('2d6_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/2d6_dice[03].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d8_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d8_dice[00].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d8_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d8_dice[01].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d8_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d8_dice[02].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d8_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d8_dice[03].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d10_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d10_dice[00].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d10_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d10_dice[01].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d10_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d10_dice[02].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d10_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d10_dice[03].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d12_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d12_dice[00].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d12_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d12_dice[01].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d12_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d12_dice[02].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d12_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d12_dice[03].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d20_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d20_dice[00].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d20_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d20_dice[01].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d20_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d20_dice[02].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d20_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d20_dice[03].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d100_dice[00]').toContext();
    fileContext.url = './assets/images/april_dice/1d100_dice[00].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d100_dice[01]').toContext();
    fileContext.url = './assets/images/april_dice/1d100_dice[01].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d100_dice[02]').toContext();
    fileContext.url = './assets/images/april_dice/1d100_dice[02].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('1d100_dice[03]').toContext();
    fileContext.url = './assets/images/april_dice/1d100_dice[03].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('april[00]').toContext();
    fileContext.url = './assets/images/april/april[00].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';

    fileContext = ImageFile.createEmpty('april[01]').toContext();
    fileContext.url = './assets/images/april/april[01].png';
    file = this.imageStorage.add(fileContext);
    ImageTag.create(file.identifier).tag = 'システム予約';
  }

  makeDefaultTabletopObjects() {
    let testCharacter: GameCharacter;
    let testFile: ImageFile;
    let fileContext: ImageContext;

    //-------------------------
    testCharacter = new GameCharacter('testCharacter_1');
    fileContext = ImageFile.createEmpty('testCharacter_1_image').toContext();
    fileContext.url = './assets/images/mon_052.gif';
    testFile = this.imageStorage.add(fileContext);
    testCharacter.location.x = 5 * 50;
    testCharacter.location.y = 9 * 50;
    testCharacter.initialize();
    ImageTag.create(testFile.identifier).tag = 'モンスター'; //本家PR #92より

    CharacterTemplateFactory.createDefault(testCharacter, 'モンスターA', 1, testFile.identifier);
    this.addBuffRound(testCharacter, 'テストバフ1', '防+1', 3);
    //-------------------------
    testCharacter = new GameCharacter('testCharacter_2');
    testCharacter.location.x = 8 * 50;
    testCharacter.location.y = 8 * 50;
    testCharacter.initialize();
    CharacterTemplateFactory.createDefault(testCharacter, 'モンスターB', 1, testFile.identifier);

    //-------------------------
    testCharacter = new GameCharacter('testCharacter_3');
    fileContext = ImageFile.createEmpty('testCharacter_3_image').toContext();
    fileContext.url = './assets/images/mon_128.gif';
    testCharacter.location.x = 4 * 50;
    testCharacter.location.y = 2 * 50;
    testCharacter.initialize();

    testFile = this.imageStorage.add(fileContext);
    ImageTag.create(testFile.identifier).tag = 'モンスター'; //本家PR #92より
    CharacterTemplateFactory.createDefault(testCharacter, 'モンスターC', 3, testFile.identifier);
    //-------------------------

    testCharacter = new GameCharacter('testCharacter_4');
    fileContext = ImageFile.createEmpty('testCharacter_4_image').toContext();
    fileContext.url = './assets/images/mon_150.gif';
    //本家PR #92より
    //    fileContext.tag = 'テスト01';

    testFile = this.imageStorage.add(fileContext);

    ImageTag.create(testFile.identifier).tag = ''; //本家PR #92より
    testCharacter.location.x = 6 * 50;
    testCharacter.location.y = 11 * 50;
    testCharacter.initialize();
    CharacterTemplateFactory.createDefault(testCharacter, 'キャラクターA', 1, testFile.identifier);
    this.addBuffRound(testCharacter, 'テストバフ2', '攻撃+10', 1);
    //-------------------------
    testCharacter = new GameCharacter('testCharacter_5');
    fileContext = ImageFile.createEmpty('testCharacter_5_image').toContext();
    fileContext.url = './assets/images/mon_211.gif';
    testFile = this.imageStorage.add(fileContext);
    testCharacter.location.x = 12 * 50;
    testCharacter.location.y = 12 * 50;
    testCharacter.initialize();
    CharacterTemplateFactory.createDefault(testCharacter, 'キャラクターB', 1, testFile.identifier);
    this.addBuffRound(testCharacter, 'テストバフ2', '攻撃+10', 1);

    //-------------------------

    testCharacter = new GameCharacter('testCharacter_6');
    fileContext = ImageFile.createEmpty('testCharacter_6_image').toContext();
    fileContext.url = './assets/images/mon_135.gif';
    testFile = this.imageStorage.add(fileContext);

    ImageTag.create(testFile.identifier).tag = ''; //本家PR #92より

    testCharacter.initialize();
    testCharacter.location.x = 5 * 50;
    testCharacter.location.y = 13 * 50;
    testCharacter.initialize();
    CharacterTemplateFactory.createDefault(testCharacter, 'キャラクターC', 1, testFile.identifier);
    this.addBuffRound(testCharacter, 'テストバフ3', '', 3);

    //-------------------------

    testCharacter = new GameCharacter('testCharacter_7');
    fileContext = ImageFile.createEmpty('testCharacter_7_image').toContext();
    fileContext.url = './assets/images/ninja.png';
    testFile = this.imageStorage.add(fileContext);

    ImageTag.create(testFile.identifier).tag = ''; //本家PR #92より

    testCharacter.initialize();
    testCharacter.location.x = 10 * 50;
    testCharacter.location.y = 5 * 50;
    CharacterTemplateFactory.createCheckTable(testCharacter, '忍者A', 1, testFile.identifier);
  }

  makeDefaultContextMenuActions(position: PointerCoordinate): ContextMenuAction[] {
    return [
      this.getCreateCharacterMenu(position),
      this.getCreateTableMaskMenu(position),
      this.getCreateTerrainMenu(position),
      this.getCreateTextNoteMenu(position),
      this.getCreateTrumpMenu(position),
      this.getCreateDiceSymbolMenu(position),
      this.getCreateRangeMenu(position),
    ];
  }

  private getCreateCharacterMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: 'キャラクターを作成',
      action: () => {
        const character = this.createGameCharacter(position);
        EventSystem.trigger('SELECT_TABLETOP_OBJECT', {
          identifier: character.identifier,
          className: character.aliasName,
        });
        SoundEffect.play(PresetSound.piecePut);
      },
    };
  }

  private getCreateTableMaskMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: 'マップマスクを作成',
      action: () => {
        this.createGameTableMask(position);
        SoundEffect.play(PresetSound.cardPut);
      },
    };
  }

  private getCreateTerrainMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: '地形を作成',
      action: () => {
        this.createTerrain(position);
        SoundEffect.play(PresetSound.blockPut);
      },
    };
  }

  private getCreateTextNoteMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: '共有メモを作成',
      action: () => {
        this.createTextNote(position);
        SoundEffect.play(PresetSound.cardPut);
      },
    };
  }

  private getCreateTrumpMenu(position: PointerCoordinate): ContextMenuAction {
    return {
      name: 'トランプの山札を作成',
      action: () => {
        this.createTrump(position);
        SoundEffect.play(PresetSound.cardPut);
      },
    };
  }

  private getCreateDiceSymbolMenu(position: PointerCoordinate): ContextMenuAction {
    const dices: { menuName: string; diceName: string; type: DiceType; imagePathPrefix: string }[] = [
      { menuName: 'D4', diceName: 'D4', type: DiceType.D4, imagePathPrefix: '4_dice' },
      { menuName: 'D6', diceName: 'D6', type: DiceType.D6, imagePathPrefix: '6_dice' },
      { menuName: 'D8', diceName: 'D8', type: DiceType.D8, imagePathPrefix: '8_dice' },
      { menuName: 'D10', diceName: 'D10', type: DiceType.D10, imagePathPrefix: '10_dice' },
      { menuName: 'D10 (00-90)', diceName: 'D10', type: DiceType.D10_10TIMES, imagePathPrefix: '100_dice' },
      { menuName: 'D12', diceName: 'D12', type: DiceType.D12, imagePathPrefix: '12_dice' },
      { menuName: 'D20', diceName: 'D20', type: DiceType.D20, imagePathPrefix: '20_dice' },
    ];
    const subMenus: ContextMenuAction[] = [];

    dices.forEach((item) => {
      subMenus.push({
        name: item.menuName,
        action: () => {
          this.createDiceSymbol(position, item.diceName, item.type, item.imagePathPrefix);
          SoundEffect.play(PresetSound.dicePut);
        },
      });
    });
    return { name: 'ダイスを作成', action: undefined, subActions: subMenus };
  }

  private getCreateRangeMenu(position: PointerCoordinate): ContextMenuAction {
    const dices: { menuName: string; typeName: string }[] = [
      { menuName: 'コーン', typeName: 'CORN' },
      { menuName: '直線', typeName: 'LINE' },
      { menuName: '円', typeName: 'CIRCLE' },
      { menuName: '正方形', typeName: 'SQUARE' },
      { menuName: 'ダイヤ', typeName: 'DIAMOND' },
    ];
    const subMenus: ContextMenuAction[] = [];

    dices.forEach((item) => {
      subMenus.push({
        name: item.menuName,
        action: () => {
          this.createRangeArea(position, item.typeName);
          SoundEffect.play(PresetSound.dicePut);
        },
      });
    });
    return { name: '射程範囲を作成', action: undefined, subActions: subMenus };
  }

  private getViewTable(): GameTable {
    return this.tableSelecter.viewTable;
  }
}
