import { ImageContext, ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { CharacterTemplateFactory } from '@axe/domain/character/character-template-factory';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { ImageTag } from '@axe/domain/media/image-tag';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';

function addBuffRound(character: GameCharacter, name: string, subcom: string, round: number): void {
  if (character.buffDataElement?.children) {
    for (const dataElm of character.buffDataElement.children) {
      dataElm.appendChild(
        DataElement.create(
          name,
          round,
          { type: DataElementType.NUMBER_RESOURCE, currentValue: subcom },
          name + '_' + character.identifier
        )
      );
      return;
    }
  }
}

export function makeDefaultTable(imageStorage: ImageStorage): void {
  const tableSelecter = new TableSelecter('tableSelecter');
  tableSelecter.initialize();

  const gameTable = new GameTable('gameTable');
  const bgFileContext = ImageFile.createEmpty('testTableBackgroundImage_image').toContext();
  bgFileContext.url = './assets/images/table_forest_clearing.jpg';
  const testBgFile = imageStorage.add(bgFileContext);
  ImageTag.create(testBgFile.identifier).tag = '背景';
  gameTable.name = '最初のテーブル';
  gameTable.imageIdentifier = testBgFile.identifier;
  gameTable.width = 20;
  gameTable.height = 15;
  gameTable.initialize();

  tableSelecter.viewTableIdentifier = gameTable.identifier;
}

export function makeDefaultTabletopObjects(imageStorage: ImageStorage): void {
  let testCharacter: GameCharacter;
  let testFile: ImageFile;
  let fileContext: ImageContext;

  testCharacter = new GameCharacter('testCharacter_1');
  fileContext = ImageFile.createEmpty('testCharacter_1_image').toContext();
  fileContext.url = './assets/images/piece_goblin.png';
  testFile = imageStorage.add(fileContext);
  testCharacter.location.x = 5 * 50;
  testCharacter.location.y = 9 * 50;
  testCharacter.initialize();
  ImageTag.create(testFile.identifier).tag = 'モンスター';

  CharacterTemplateFactory.createDefault(testCharacter, 'モンスターA', 1, testFile.identifier);
  addBuffRound(testCharacter, 'テストバフ1', '防+1', 3);

  testCharacter = new GameCharacter('testCharacter_2');
  testCharacter.location.x = 8 * 50;
  testCharacter.location.y = 8 * 50;
  testCharacter.initialize();
  CharacterTemplateFactory.createDefault(testCharacter, 'モンスターB', 1, testFile.identifier);

  testCharacter = new GameCharacter('testCharacter_3');
  fileContext = ImageFile.createEmpty('testCharacter_3_image').toContext();
  fileContext.url = './assets/images/piece_golem.png';
  testCharacter.location.x = 4 * 50;
  testCharacter.location.y = 2 * 50;
  testCharacter.initialize();

  testFile = imageStorage.add(fileContext);
  ImageTag.create(testFile.identifier).tag = 'モンスター';
  CharacterTemplateFactory.createDefault(testCharacter, 'モンスターC', 3, testFile.identifier);

  testCharacter = new GameCharacter('testCharacter_4');
  fileContext = ImageFile.createEmpty('testCharacter_4_image').toContext();
  fileContext.url = './assets/images/piece_knight.png';

  testFile = imageStorage.add(fileContext);

  ImageTag.create(testFile.identifier).tag = '';
  testCharacter.location.x = 6 * 50;
  testCharacter.location.y = 11 * 50;
  testCharacter.initialize();
  CharacterTemplateFactory.createDefault(testCharacter, 'キャラクターA', 1, testFile.identifier);
  addBuffRound(testCharacter, 'テストバフ2', '攻撃+10', 1);

  testCharacter = new GameCharacter('testCharacter_5');
  fileContext = ImageFile.createEmpty('testCharacter_5_image').toContext();
  fileContext.url = './assets/images/piece_wizard.png';
  testFile = imageStorage.add(fileContext);
  testCharacter.location.x = 12 * 50;
  testCharacter.location.y = 12 * 50;
  testCharacter.initialize();
  CharacterTemplateFactory.createDefault(testCharacter, 'キャラクターB', 1, testFile.identifier);
  addBuffRound(testCharacter, 'テストバフ2', '攻撃+10', 1);

  testCharacter = new GameCharacter('testCharacter_6');
  fileContext = ImageFile.createEmpty('testCharacter_6_image').toContext();
  fileContext.url = './assets/images/piece_scout.png';
  testFile = imageStorage.add(fileContext);

  ImageTag.create(testFile.identifier).tag = '';

  testCharacter.initialize();
  testCharacter.location.x = 5 * 50;
  testCharacter.location.y = 13 * 50;
  testCharacter.initialize();
  CharacterTemplateFactory.createDefault(testCharacter, 'キャラクターC', 1, testFile.identifier);
  addBuffRound(testCharacter, 'テストバフ3', '', 3);
}
