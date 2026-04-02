import { ImageContext, ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { CharacterTemplateFactory } from '@axe/domain/character/character-template-factory';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { ImageTag } from '@axe/domain/media/image-tag';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';

// バフ追加identifierを固定にするため初期キャラのバフはGameCharacterでやらずにここでやる
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
  bgFileContext.url = './assets/images/BG10a_80.jpg';
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

  //-------------------------
  testCharacter = new GameCharacter('testCharacter_1');
  fileContext = ImageFile.createEmpty('testCharacter_1_image').toContext();
  fileContext.url = './assets/images/mon_052.gif';
  testFile = imageStorage.add(fileContext);
  testCharacter.location.x = 5 * 50;
  testCharacter.location.y = 9 * 50;
  testCharacter.initialize();
  ImageTag.create(testFile.identifier).tag = 'モンスター'; //本家PR #92より

  CharacterTemplateFactory.createDefault(testCharacter, 'モンスターA', 1, testFile.identifier);
  addBuffRound(testCharacter, 'テストバフ1', '防+1', 3);
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

  testFile = imageStorage.add(fileContext);
  ImageTag.create(testFile.identifier).tag = 'モンスター'; //本家PR #92より
  CharacterTemplateFactory.createDefault(testCharacter, 'モンスターC', 3, testFile.identifier);
  //-------------------------

  testCharacter = new GameCharacter('testCharacter_4');
  fileContext = ImageFile.createEmpty('testCharacter_4_image').toContext();
  fileContext.url = './assets/images/mon_150.gif';

  testFile = imageStorage.add(fileContext);

  ImageTag.create(testFile.identifier).tag = ''; //本家PR #92より
  testCharacter.location.x = 6 * 50;
  testCharacter.location.y = 11 * 50;
  testCharacter.initialize();
  CharacterTemplateFactory.createDefault(testCharacter, 'キャラクターA', 1, testFile.identifier);
  addBuffRound(testCharacter, 'テストバフ2', '攻撃+10', 1);
  //-------------------------
  testCharacter = new GameCharacter('testCharacter_5');
  fileContext = ImageFile.createEmpty('testCharacter_5_image').toContext();
  fileContext.url = './assets/images/mon_211.gif';
  testFile = imageStorage.add(fileContext);
  testCharacter.location.x = 12 * 50;
  testCharacter.location.y = 12 * 50;
  testCharacter.initialize();
  CharacterTemplateFactory.createDefault(testCharacter, 'キャラクターB', 1, testFile.identifier);
  addBuffRound(testCharacter, 'テストバフ2', '攻撃+10', 1);

  //-------------------------

  testCharacter = new GameCharacter('testCharacter_6');
  fileContext = ImageFile.createEmpty('testCharacter_6_image').toContext();
  fileContext.url = './assets/images/mon_135.gif';
  testFile = imageStorage.add(fileContext);

  ImageTag.create(testFile.identifier).tag = ''; //本家PR #92より

  testCharacter.initialize();
  testCharacter.location.x = 5 * 50;
  testCharacter.location.y = 13 * 50;
  testCharacter.initialize();
  CharacterTemplateFactory.createDefault(testCharacter, 'キャラクターC', 1, testFile.identifier);
  addBuffRound(testCharacter, 'テストバフ3', '', 3);

  //-------------------------

  testCharacter = new GameCharacter('testCharacter_7');
  fileContext = ImageFile.createEmpty('testCharacter_7_image').toContext();
  fileContext.url = './assets/images/ninja.png';
  testFile = imageStorage.add(fileContext);

  ImageTag.create(testFile.identifier).tag = ''; //本家PR #92より

  testCharacter.initialize();
  testCharacter.location.x = 10 * 50;
  testCharacter.location.y = 5 * 50;
  CharacterTemplateFactory.createCheckTable(testCharacter, '忍者A', 1, testFile.identifier);
}
