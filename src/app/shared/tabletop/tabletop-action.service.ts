import { inject, Injectable } from '@angular/core';
import { PointerCoordinate } from '@axe/core/input/pointer-device.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DiceSymbol, DiceType } from '@axe/domain/dice/dice-symbol';
import { ImageTag } from '@axe/domain/media/image-tag';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';
import {
  getDiceMenuItems,
  getRangeMenuItems,
  getTrumpCardCodes,
  TERRAIN_TEXTURE_PATH,
  TRUMP_BACK_IMAGE_PATH,
} from '@axe/shared/tabletop/tabletop-action-helpers';
import { initAprilDiceImages } from '@axe/shared/tabletop/tabletop-default-dice';
import {
  makeDefaultTable as _makeDefaultTable,
  makeDefaultTabletopObjects as _makeDefaultTabletopObjects,
} from '@axe/shared/tabletop/tabletop-default-setup';
import { ContextMenuAction } from '@axe/shared/ui/context-menu.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';

@Injectable({
  providedIn: 'root',
})
export class TabletopActionService {
  private readonly imageStorage = inject(ImageStorage);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly selectionSignalService = inject(SelectionSignalService);

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
    const url = TERRAIN_TEXTURE_PATH;
    let image = this.imageStorage.get(url);
    if (!image) {
      image = this.imageStorage.add(url);
      ImageTag.create(image.identifier).tag = '地形';
    }
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
    diceSymbol.faces.forEach((face) => {
      const url: string = `./assets/images/dice/${imagePathPrefix}/${imagePathPrefix}[${face}].png`;
      let image = this.imageStorage.get(url);
      if (!image) {
        image = this.imageStorage.add(url);
      }
      const faceEl = diceSymbol.imageDataElement?.getFirstElementByName(face);
      if (faceEl) faceEl.value = image.identifier;
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
        range = RangeArea.create('射程範囲', 1, 4, 100);
        break;
      case 'CIRCLE':
        range = RangeArea.create('射程範囲', 3, 3, 100);
        break;
      case 'SQUARE':
        range = RangeArea.create('射程範囲', 3, 3, 100);
        break;
      case 'TRIANGLE':
        range = RangeArea.create('射程範囲', 3, 3, 100);
        break;
      case 'PENTAGON':
        range = RangeArea.create('射程範囲', 3, 3, 100);
        break;
      case 'HEXAGON':
        range = RangeArea.create('射程範囲', 3, 3, 100);
        break;
      case 'CORN':
      default:
        range = RangeArea.create('射程範囲', 3, 3, 100);
        break;
    }

    range.location.x = position.x;
    range.location.y = position.y;
    range.posZ = position.z;
    range.type = typeName;
    const data = range.commonDataElement?.getFirstElementByName('opacity');
    if (data) data.currentValue = 60;
    return range;
  }

  createTrump(position: PointerCoordinate): CardStack {
    const cardStack = CardStack.create('トランプ山札');
    cardStack.location.x = position.x - 25;
    cardStack.location.y = position.y - 25;
    cardStack.posZ = position.z;

    const back = TRUMP_BACK_IMAGE_PATH;
    if (!this.imageStorage.get(back)) {
      const image = this.imageStorage.add(back);
      ImageTag.create(image.identifier).tag = 'トランプ';
    }
    for (const trump of getTrumpCardCodes()) {
      const url: string = './assets/images/trump/' + trump + '.gif';
      if (!this.imageStorage.get(url)) {
        const image = this.imageStorage.add(url);
        ImageTag.create(image.identifier).tag = 'トランプ';
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
    const subMenus: ContextMenuAction[] = [];

    getDiceMenuItems().forEach((item) => {
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
    const subMenus: ContextMenuAction[] = [];

    getRangeMenuItems().forEach((item) => {
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

  private getViewTable(): GameTable | null {
    return this.tableSelecter.viewTable;
  }
}
