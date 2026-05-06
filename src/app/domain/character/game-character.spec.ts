import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
  DataElementViewMode,
} from '@axe/domain/data/data-element';

describe('GameCharacter', () => {
  let character: GameCharacter;

  beforeEach(() => {
    character = new GameCharacter();
  });

  afterEach(() => {
    const allObjects = ObjectStore.instance.getObjects();
    allObjects.forEach((obj) => ObjectStore.instance.delete(obj, false));
    ObjectStore.instance.clearDeleteHistory();
  });

  // ----------------------------------------------------------------
  // aliasName
  // ----------------------------------------------------------------
  describe('aliasName', () => {
    it("リテラル型 'character' を返す", () => {
      expect(character.aliasName).toBe('character');
    });
  });

  // ----------------------------------------------------------------
  // chatBubbleAltitude
  // ----------------------------------------------------------------
  describe('chatBubbleAltitude', () => {
    it('初期値は 0', () => {
      expect(character.chatBubbleAltitude).toBe(0);
    });

    it('数値を設定できる', () => {
      character.chatBubbleAltitude = 120;
      expect(character.chatBubbleAltitude).toBe(120);
    });
  });

  // ----------------------------------------------------------------
  // specifyKomaImageFlag / komaImageHeight
  // ----------------------------------------------------------------
  describe('specifyKomaImageFlag', () => {
    it('初期値は false', () => {
      expect(character.specifyKomaImageFlag).toBe(false);
    });
  });

  describe('komaImageHeight', () => {
    it('初期値は 100', () => {
      expect(character.komaImageHeight).toBe(100);
    });
  });

  // ----------------------------------------------------------------
  // imageFile null safety
  // ----------------------------------------------------------------
  describe('imageFile', () => {
    it('imageDataElementが無い場合はImageFile.Emptyを返す', () => {
      expect(character.imageFile).toBeDefined();
      expect(character.imageFile.url).toBe('');
    });
  });

  // ----------------------------------------------------------------
  // buffs (キャッシュ)
  // ----------------------------------------------------------------
  describe('buffs', () => {
    it('createDataElements後に複数回呼び出しても同一インスタンスを返す', () => {
      character.createDataElements();
      expect(character.buffs).toBe(character.buffs);
    });
  });

  // ----------------------------------------------------------------
  // status (キャッシュ)
  // ----------------------------------------------------------------
  describe('status', () => {
    it('createDataElements後に複数回呼び出しても同一インスタンスを返す', () => {
      character.createDataElements();
      expect(character.status).toBe(character.status);
    });
  });

  describe('detail data hierarchy migration', () => {
    it('セクション直下の既存フィールドを基本グループ配下へ読み替える', () => {
      character.createDataElements();
      const detail = character.detailDataElement!;
      const section = DataElement.create('旧セクション', '');
      const fieldA = DataElement.create('A', '1');
      const fieldB = DataElement.create('B', '2');
      detail.appendChild(section);
      section.appendChild(fieldA);
      section.appendChild(fieldB);

      character.normalizeDetailDataElementHierarchy();

      expect(section.fieldRole).toBe(DataElementRole.SECTION);
      expect(section.children.map((child) => child.name)).toEqual(['基本']);
      const group = section.children[0];
      expect(group.fieldRole).toBe(DataElementRole.GROUP);
      expect(group.children.map((child) => child.name)).toEqual(['A', 'B']);
      expect(fieldA.fieldRole).toBe(DataElementRole.FIELD);
      expect(fieldB.fieldRole).toBe(DataElementRole.FIELD);
    });

    it('既存グループとフィールドが混在する場合は順序を保って読み替える', () => {
      character.createDataElements();
      const detail = character.detailDataElement!;
      const section = DataElement.create('旧セクション', '');
      const fieldA = DataElement.create('A', '1');
      const group = DataElement.create('既存グループ', '', { role: DataElementRole.GROUP });
      const groupField = DataElement.create('C', '3');
      const fieldB = DataElement.create('B', '2');
      detail.appendChild(section);
      section.appendChild(fieldA);
      section.appendChild(group);
      group.appendChild(groupField);
      section.appendChild(fieldB);

      character.normalizeDetailDataElementHierarchy();

      expect(section.children.map((child) => child.name)).toEqual(['基本', '既存グループ', '基本 2']);
      expect(section.children[0].children.map((child) => child.name)).toEqual(['A']);
      expect(section.children[1].children.map((child) => child.name)).toEqual(['C']);
      expect(section.children[2].children.map((child) => child.name)).toEqual(['B']);
    });

    it('グループ内グループは3段階構造として保持する', () => {
      character.createDataElements();
      const detail = character.detailDataElement!;
      const section = DataElement.create('セクション', '', { role: DataElementRole.SECTION });
      const group = DataElement.create('グループ', '', { role: DataElementRole.GROUP });
      const nestedGroup = DataElement.create('下位グループ', '', { role: DataElementRole.GROUP });
      const field = DataElement.create('タグ', '値');
      detail.appendChild(section);
      section.appendChild(group);
      group.appendChild(nestedGroup);
      nestedGroup.appendChild(field);

      character.normalizeDetailDataElementHierarchy();

      expect(section.children).toEqual([group]);
      expect(group.children).toEqual([nestedGroup]);
      expect(nestedGroup.children).toEqual([field]);
      expect(group.fieldRole).toBe(DataElementRole.GROUP);
      expect(nestedGroup.fieldRole).toBe(DataElementRole.GROUP);
      expect(field.fieldRole).toBe(DataElementRole.FIELD);
    });

    it('ロードされた旧XMLもparse時に3層構造へ読み替える', () => {
      const xml = `<character>
    <data name="character">
    <data name="image"><data name="imageIdentifier" type="image"></data></data>
    <data name="common"></data>
    <data name="detail"><data name="旧セクション"><data name="A">1</data></data></data>
    </data>
    </character>`;

      const restored = ObjectSerializer.instance.parseXml(xml) as GameCharacter;
      const restoredSection = restored.detailDataElement!.getFirstElementByName('旧セクション')!;

      expect(restoredSection.fieldRole).toBe(DataElementRole.SECTION);
      expect(restoredSection.children.map((child) => child.name)).toEqual(['基本']);
      expect(restoredSection.children[0].children.map((child) => child.name)).toEqual(['A']);
    });

    it('ロードされた旧チェック表フィールドをparse時に構造化テーブルへ読み替える', () => {
      const xml = `<character>
    <data name="character">
    <data name="image"><data name="imageIdentifier" type="image"></data></data>
    <data name="common"></data>
    <data name="detail"><data name="情報"><data name="旧表" type="checktable">|項目|済み|\n|灯火|[x]|</data></data></data>
    </data>
    </character>`;

      const restored = ObjectSerializer.instance.parseXml(xml) as GameCharacter;
      const convertedTable = restored.detailDataElement!.getFirstElementByName('旧表')!;
      const checkCell = convertedTable.children[0].getFirstElementByName('済み');

      expect(convertedTable.fieldRole).toBe(DataElementRole.SECTION);
      expect(convertedTable.viewMode).toBe(DataElementViewMode.TABLE);
      expect(checkCell?.fieldType).toBe(DataElementFieldType.CHECK);
      expect(checkCell?.value).toBe(1);
      expect(convertedTable.children[0].getFirstElementByName('項目')?.value).toBe('灯火');
      expect(restored.detailDataElement!.getElementsByName('旧表')).toHaveLength(1);
      expect(convertedTable.getAttribute(DataElementAttribute.FIELD_TYPE)).toBe('');
    });

    it('旧ポップアップ表示タグ配列をDataElement属性へ読み替える', () => {
      character.createDataElements();
      const detail = character.detailDataElement!;
      const section = DataElement.create('表示セクション', '', { role: DataElementRole.SECTION });
      detail.appendChild(section);
      character.overViewDataTags = [section.identifier];

      character.addExtendData();

      expect(section.getAttribute(DataElementAttribute.POPUP)).toBe('true');
      expect(character.overViewDataTags).toEqual([]);
    });
  });
});
