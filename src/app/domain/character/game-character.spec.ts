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
import { LightCategory, LightPreset, VisionType } from '@axe/domain/tabletop/vision-types';

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
    it('names itself a character', () => {
      expect(character.aliasName).toBe('character');
    });
  });

  // ----------------------------------------------------------------
  // chatBubbleAltitude
  // ----------------------------------------------------------------
  describe('chatBubbleAltitude', () => {
    it('starts at nothing', () => {
      expect(character.chatBubbleAltitude).toBe(0);
    });

    it('takes a number', () => {
      character.chatBubbleAltitude = 120;
      expect(character.chatBubbleAltitude).toBe(120);
    });
  });

  // ----------------------------------------------------------------
  // specifyKomaImageFlag / komaImageHeight
  // ----------------------------------------------------------------
  describe('specifyKomaImageFlag', () => {
    it('starts false', () => {
      expect(character.specifyKomaImageFlag).toBe(false);
    });
  });

  describe('sight and light in the dark', () => {
    it('starts with ordinary sight, no range and shadows cast', () => {
      expect(character.visionType).toBe(VisionType.NORMAL);
      expect(character.visionRange).toBe(0);
      expect(character.castsShadow).toBe(true);
    });

    it('starts unlit and custom', () => {
      expect(character.lightEnabled).toBe(false);
      expect(character.lightPreset).toBe(LightPreset.CUSTOM);
      expect(character.lightAngle).toBe(360);
    });

    it('builds the specification as a physical light', () => {
      character.lightEnabled = true;
      character.lightBrightRadius = 3;
      character.lightDimRadius = 6;
      const spec = character.lightSpec;
      expect(spec.enabled).toBe(true);
      expect(spec.brightRadius).toBe(3);
      expect(spec.dimRadius).toBe(6);
      expect(spec.category).toBe(LightCategory.PHYSICAL);
      expect(spec.ignoreOcclusion).toBe(false);
      expect(spec.revealToAll).toBe(false);
    });

    it('turns the light with the character, with its own direction as an offset', () => {
      character.rotate = 90;
      character.lightDirection = 10;
      expect(character.lightSpec.direction).toBe(100);
      character.rotate = 200;
      expect(character.lightSpec.direction).toBe(210);
    });
  });

  describe('komaImageHeight', () => {
    it('starts at a hundred', () => {
      expect(character.komaImageHeight).toBe(100);
    });
  });

  // ----------------------------------------------------------------
  // imageFile null safety
  // ----------------------------------------------------------------
  describe('imageFile', () => {
    it('returns an empty picture when it carries no image element', () => {
      expect(character.imageFile).toBeDefined();
      expect(character.imageFile.url).toBe('');
    });
  });

  // ----------------------------------------------------------------
  // the buffs, which are cached
  // ----------------------------------------------------------------
  describe('buffs', () => {
    it('returns the same instance however often it is asked', () => {
      character.createDataElements();
      expect(character.buffs).toBe(character.buffs);
    });
  });

  // ----------------------------------------------------------------
  // the status, which is cached
  // ----------------------------------------------------------------
  describe('status', () => {
    it('returns the same instance however often it is asked', () => {
      character.createDataElements();
      expect(character.status).toBe(character.status);
    });
  });

  describe('detail data hierarchy migration', () => {
    it('reads a field directly under a section into the basic group', () => {
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

    it('keeps the order when groups and fields are mixed', () => {
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

    it('keeps a group inside a group as the third level', () => {
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

    it('reads older saved data into those three levels', () => {
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

    it('reads the older check fields into proper tables', () => {
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

    it('reads the older pop-up tags onto the elements themselves', () => {
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

  // ----------------------------------------------------------------
  // folderName
  // ----------------------------------------------------------------
  describe('folderName', () => {
    it('starts in no folder', () => {
      expect(character.folderName).toBe('');
    });

    it('stays out of one when older saved data says nothing about it', () => {
      const xml = `<character>
    <data name="character">
    <data name="image"><data name="imageIdentifier" type="image"></data></data>
    <data name="common"></data>
    <data name="detail"></data>
    </data>
    </character>`;

      const restored = ObjectSerializer.instance.parseXml(xml) as GameCharacter;

      expect(restored.folderName).toBe('');
    });

    it('writes the folder it is in into saved data', () => {
      character.folderName = '第1話/洞窟';

      expect(ObjectSerializer.instance.toXml(character)).toContain('folderName="第1話/洞窟"');
    });

    it('reads the folder back out of saved data', () => {
      const restored = ObjectSerializer.instance.parseXml(
        '<character folderName="第1話/洞窟"></character>'
      ) as GameCharacter;

      expect(restored.folderName).toBe('第1話/洞窟');
    });

    it('keeps what a newer version wrote and it does not know about', () => {
      const xml = '<character folderName="第1話" somethingLater="42"></character>';

      const restored = ObjectSerializer.instance.parseXml(xml) as GameCharacter;

      expect(restored.folderName).toBe('第1話');
      expect(ObjectSerializer.instance.toXml(restored)).toContain('somethingLater="42"');
    });
  });
});
