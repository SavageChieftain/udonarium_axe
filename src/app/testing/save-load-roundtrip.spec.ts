import { TestBed } from '@angular/core/testing';
import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
} from '@axe/domain/data/data-element';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { Terrain, TerrainViewState } from '@axe/domain/tabletop/terrain';

describe('セーブ/ロード ラウンドトリップ', () => {
  let store: ObjectStore;
  let serializer: ObjectSerializer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    serializer = ObjectSerializer.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    (ChatTabList as unknown as { _instance: ChatTabList | undefined })._instance = undefined;
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    (ChatTabList as unknown as { _instance: ChatTabList | undefined })._instance = undefined;
  });

  describe('Terrain シリアライズ', () => {
    it('ObjectFactory に terrain が登録されている', () => {
      const obj = ObjectFactory.instance.create('terrain');
      expect(obj).toBeTruthy();
      expect(obj).toBeInstanceOf(Terrain);
      obj?.destroy();
    });

    it('toXml が全SyncVarを属性として含む', () => {
      const terrain = Terrain.create('山岳', 3, 4, 2, 'w', 'f');
      terrain.isLocked = true;
      terrain.mode = TerrainViewState.WALL;
      terrain.rotate = 90;
      terrain.isGrid = true;

      const xml = serializer.toXml(terrain);

      expect(xml).toContain('isLocked="true"');
      expect(xml).toContain('mode="2"');
      expect(xml).toContain('rotate="90"');
      expect(xml).toContain('isGrid="true"');
    });

    it('toXml が location をドット記法で含む', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      terrain.location = { name: 'table', x: 150, y: 250 };
      terrain.posZ = 42;

      const xml = serializer.toXml(terrain);

      expect(xml).toContain('location.name="table"');
      expect(xml).toContain('location.x="150"');
      expect(xml).toContain('location.y="250"');
      expect(xml).toContain('posZ="42"');
    });

    it('toXml がDataElement子要素を含む', () => {
      const terrain = Terrain.create('砂漠', 5, 6, 3, 'wall-id', 'floor-id');

      const xml = serializer.toXml(terrain);

      expect(xml).toContain('<data');
      expect(xml).toContain('name="terrain"');
      expect(xml).toContain('name="wall"');
      expect(xml).toContain('name="floor"');
      expect(xml).toContain('>wall-id</data>');
      expect(xml).toContain('>floor-id</data>');
      expect(xml).toContain('>砂漠</data>');
    });

    it('GameTable 内の Terrain が toXml に含まれる', () => {
      const table = new GameTable();
      table.initialize();
      const terrain = Terrain.create('丘', 2, 2, 1, '', '');
      table.appendChild(terrain);

      const xml = serializer.toXml(table);

      expect(xml).toContain('<game-table');
      expect(xml).toContain('<terrain');
      expect(xml).toContain('>丘</data>');
    });
  });

  describe('DataElement ラウンドトリップ（happy-dom互換）', () => {
    it('DataElement のシリアライズ/デシリアライズ', () => {
      const original = DataElement.create('testName', 'testValue', { type: 'image' });
      const xml = serializer.toXml(original);

      original.destroy();
      store.clearDeleteHistory();

      const restored = serializer.parseXml(xml) as DataElement;
      expect(restored).toBeInstanceOf(DataElement);
      expect(restored.getAttribute('name')).toBe('testName');
      expect(restored.value).toBe('testValue');
      expect(restored.getAttribute('type')).toBe('image');
    });

    it('ネストした DataElement 親子が保存/復元される', () => {
      const root = DataElement.create('root', '');
      const child1 = DataElement.create('name', '地形A');
      const child2 = DataElement.create('width', 5);
      root.appendChild(child1);
      root.appendChild(child2);

      const xml = serializer.toXml(root);
      root.destroy();
      store.clearDeleteHistory();

      const restored = serializer.parseXml(xml) as DataElement;
      expect(restored.children).toHaveLength(2);
      expect(restored.getFirstElementByName('name')?.value).toBe('地形A');
      expect(restored.getFirstElementByName('width')?.value).toBe('5');
    });

    it('カスタムフィールドの role / fieldType / metadata が保存/復元される', () => {
      const section = DataElement.create('能力', '', {
        [DataElementAttribute.ROLE]: DataElementRole.SECTION,
      });
      const selectField = DataElement.create('種族', '人間', {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.SELECT,
        [DataElementAttribute.CHOICES]: '人間,エルフ,ドワーフ',
      });
      const numberField = DataElement.create('筋力', 24, {
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
        [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.NUMBER,
        [DataElementAttribute.UNIT]: '点',
        [DataElementAttribute.MIN]: '0',
        [DataElementAttribute.MAX]: '100',
      });
      section.appendChild(selectField);
      section.appendChild(numberField);

      const xml = serializer.toXml(section);
      section.destroy();
      store.clearDeleteHistory();

      const restored = serializer.parseXml(xml) as DataElement;
      const restoredSelect = restored.getFirstElementByName('種族');
      const restoredNumber = restored.getFirstElementByName('筋力');

      expect(restored.fieldRole).toBe(DataElementRole.SECTION);
      expect(restoredSelect?.fieldRole).toBe(DataElementRole.FIELD);
      expect(restoredSelect?.fieldType).toBe(DataElementFieldType.SELECT);
      expect(restoredSelect?.getAttribute(DataElementAttribute.CHOICES)).toBe('人間,エルフ,ドワーフ');
      expect(restoredNumber?.fieldType).toBe(DataElementFieldType.NUMBER);
      expect(restoredNumber?.getAttribute(DataElementAttribute.UNIT)).toBe('点');
      expect(restoredNumber?.getAttribute(DataElementAttribute.MIN)).toBe('0');
      expect(restoredNumber?.getAttribute(DataElementAttribute.MAX)).toBe('100');
    });
  });

  describe('GameCharacter ラウンドトリップ', () => {
    it('キャラクター保存時に詳細カードのカラム設定がXMLへ出力される', () => {
      const character = GameCharacter.create('カラム確認', 1, '');
      const section = character.detailDataElement!.getFirstElementByName('能力')!;
      section.setAttribute('cs-colspan', 'full');
      section.setAttribute(DataElementAttribute.POPUP, 'true');

      const xml = serializer.toXml(character);
      const sectionXml = serializer.toXml(section);

      expect(xml).toContain('cs-colspan="full"');
      expect(xml).toContain('cs-popup="true"');

      character.destroy();
      store.clearDeleteHistory();

      const restoredSection = serializer.parseXml(sectionXml) as DataElement;

      expect(restoredSection.getAttribute('cs-colspan')).toBe('full');
      expect(restoredSection.getAttribute(DataElementAttribute.POPUP)).toBe('true');
    });
  });

  describe('ChatTabList parseInnerXml — 既存タブ破棄', () => {
    // happy-dom の DOMParser はドット付き属性名（imageIdentifier.0 等）を処理できないため、
    // ChatTab の toXml 出力を経由するテストは不可。
    // 代わりにドット属性を含まない最小限のXML文字列を直接構築し、
    // serializer.parseXml に渡して ChatTabList.parseInnerXml の動作を検証する。
    // parseXml は Element を受け取ると DOMParser をバイパスするため、
    // 子要素の <chat-tab> は Element として直接 parseXml に渡される。

    it('2つの初期タブが両方とも破棄される（mutation-during-iteration 回帰テスト）', () => {
      const instance = ChatTabList.instance;
      instance.addChatTab('Tab1');
      instance.addChatTab('Tab2');
      expect(instance.chatTabs).toHaveLength(2);

      const reloadCheck = new ReloadCheck('ReloadCheck');
      reloadCheck.initialize();
      reloadCheck.reloadCheckStart(false);

      // ドット属性を含まない最小限XML
      const xml = '<chat-tab-list><chat-tab name="NewOnly"></chat-tab></chat-tab-list>';
      serializer.parseXml(xml);

      // 読み込んだ部屋には必ずシステムタブが付く。数えるのは会話のタブだけ。
      expect(instance.spokenChatTabs).toHaveLength(1);
      expect(instance.spokenChatTabs[0].name).toBe('NewOnly');
      expect(instance.chatTabs.some((tab) => tab.isSystemTab)).toBe(true);
    });

    it('3つの初期タブがすべて破棄される', () => {
      const instance = ChatTabList.instance;
      instance.addChatTab('A');
      instance.addChatTab('B');
      instance.addChatTab('C');
      expect(instance.chatTabs).toHaveLength(3);

      const reloadCheck = new ReloadCheck('ReloadCheck');
      reloadCheck.initialize();
      reloadCheck.reloadCheckStart(false);

      const xml = '<chat-tab-list></chat-tab-list>';
      serializer.parseXml(xml);

      expect(instance.spokenChatTabs).toHaveLength(0);
      expect(instance.chatTabs.some((tab) => tab.isSystemTab)).toBe(true);
    });

    it('既存タブが破棄され新タブが追加される', () => {
      const instance = ChatTabList.instance;
      instance.addChatTab('Old1');
      instance.addChatTab('Old2');
      expect(instance.chatTabs).toHaveLength(2);

      const reloadCheck = new ReloadCheck('ReloadCheck');
      reloadCheck.initialize();
      reloadCheck.reloadCheckStart(false);

      const xml = [
        '<chat-tab-list>',
        '  <chat-tab name="New1"></chat-tab>',
        '  <chat-tab name="New2"></chat-tab>',
        '  <chat-tab name="New3"></chat-tab>',
        '</chat-tab-list>',
      ].join('');
      serializer.parseXml(xml);

      const names = instance.spokenChatTabs.map((t) => t.name);
      expect(names).not.toContain('Old1');
      expect(names).not.toContain('Old2');
      expect(instance.spokenChatTabs).toHaveLength(3);
      expect(names).toContain('New1');
      expect(names).toContain('New2');
      expect(names).toContain('New3');
    });
  });
});
