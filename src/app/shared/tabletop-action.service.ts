import { inject, Injectable } from '@angular/core';
import { PointerCoordinate } from '@axe/core/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DiceSymbol, DiceType } from '@axe/domain/dice/dice-symbol';
import { ImageTag } from '@axe/domain/media/image-tag';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TextNote } from '@axe/domain/shared/text-note';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { ContextMenuAction } from '@axe/shared/context-menu.service';
import { SelectionSignalService } from '@axe/shared/selection-signal.service';
import { initAprilDiceImages } from '@axe/shared/tabletop-default-dice';
import {
  makeDefaultTable as _makeDefaultTable,
  makeDefaultTabletopObjects as _makeDefaultTabletopObjects,
} from '@axe/shared/tabletop-default-setup';

@Injectable({
  providedIn: 'root',
})
export class TabletopActionService {
  private imageStorage = inject(ImageStorage);
  private tableSelecter = inject(TableSelecter);
  private selectionSignalService = inject(SelectionSignalService);

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
    _makeDefaultTable(this.imageStorage);
  }

  initAprilDiceImage() {
    initAprilDiceImages(this.imageStorage);
  }

  makeDefaultTabletopObjects() {
    _makeDefaultTabletopObjects(this.imageStorage);
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
        this.selectionSignalService.selectObject(character.identifier, character.aliasName);
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
