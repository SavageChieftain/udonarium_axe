import { ObjectStore } from '@axe/core/sync/object-store';
import { StatusAccessor } from '@axe/domain/character/status-accessor';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';

describe('StatusAccessor', () => {
  let store: ObjectStore;
  let detailDataElement: DataElement;
  let accessor: StatusAccessor;

  function createNumberResource(name: string, max: number, current: number): DataElement {
    return DataElement.create(name, max, {
      type: DataElementType.NUMBER_RESOURCE,
      currentValue: String(current),
    });
  }

  beforeEach(() => {
    store = ObjectStore.instance;
    detailDataElement = DataElement.create('detail', '');

    const resourceGroup = DataElement.create('リソース', '');
    detailDataElement.appendChild(resourceGroup);
    resourceGroup.appendChild(createNumberResource('HP', 200, 150));
    resourceGroup.appendChild(createNumberResource('MP', 100, 80));

    const abilityGroup = DataElement.create('能力', '');
    detailDataElement.appendChild(abilityGroup);
    abilityGroup.appendChild(DataElement.create('器用度', 24));
    abilityGroup.appendChild(DataElement.create('メモ', 'テスト用メモ', { type: DataElementType.NOTE }));

    accessor = new StatusAccessor(detailDataElement, () => 'テストキャラ');
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('canChangeName', () => {
    it('numberResourceの場合はtrueを返す', () => {
      expect(accessor.canChangeName('HP')).toBe(true);
    });

    it('通常テキスト(type="")の場合はtrueを返す', () => {
      expect(accessor.canChangeName('器用度')).toBe(true);
    });

    it('noteタイプの場合はtrueを返す', () => {
      expect(accessor.canChangeName('メモ')).toBe(true);
    });

    it('存在しない名前ではfalseを返す', () => {
      expect(accessor.canChangeName('存在しない')).toBe(false);
    });
  });

  describe('canChange', () => {
    it('numberResourceのnowはtrue', () => {
      expect(accessor.canChange('HP', 'now')).toBe(true);
    });

    it('numberResourceのmaxはtrue', () => {
      expect(accessor.canChange('HP', 'max')).toBe(true);
    });

    it('テキストのnowはtrue', () => {
      expect(accessor.canChange('器用度', 'now')).toBe(true);
    });

    it('テキストのmaxはfalse', () => {
      expect(accessor.canChange('器用度', 'max')).toBe(false);
    });

    it('存在しない名前ではfalseを返す', () => {
      expect(accessor.canChange('不明', 'now')).toBe(false);
    });
  });

  describe('getType', () => {
    it('numberResourceのnowではcurrentValueを返す', () => {
      expect(accessor.getType('HP', 'now')).toBe('currentValue');
    });

    it('numberResourceのmaxではvalueを返す', () => {
      expect(accessor.getType('HP', 'max')).toBe('value');
    });

    it('テキストのnowではvalueを返す', () => {
      expect(accessor.getType('器用度', 'now')).toBe('value');
    });
  });

  describe('getValue / setValue', () => {
    it('numberResourceの現在値を取得できる', () => {
      expect(accessor.getValue('HP', 'now')).toBe(150);
    });

    it('numberResourceの最大値を取得できる', () => {
      expect(accessor.getValue('HP', 'max')).toBe(200);
    });

    it('numberResourceの現在値を設定できる', () => {
      accessor.setValue('HP', 'now', 100);
      expect(accessor.getValue('HP', 'now')).toBe(100);
    });

    it('numberResourceの最大値を設定できる', () => {
      accessor.setValue('HP', 'max', 300);
      expect(accessor.getValue('HP', 'max')).toBe(300);
    });

    it('存在しない名前ではsetValueがfalseを返す', () => {
      expect(accessor.setValue('不明', 'now', 0)).toBe(false);
    });
  });

  describe('getTextType', () => {
    it('numberResourceではcurrentValueを返す', () => {
      expect(accessor.getTextType('HP')).toBe('currentValue');
    });

    it('通常テキストではvalueを返す', () => {
      expect(accessor.getTextType('器用度')).toBe('value');
    });
  });

  describe('setText', () => {
    it('テキスト型のデータを書き換えられる', () => {
      accessor.setText('器用度', '30');
      const el = detailDataElement.getFirstElementByName('器用度');
      expect(el.value).toBe('30');
    });

    it('存在しない名前ではfalseを返す', () => {
      expect(accessor.setText('不明', 'X')).toBe(false);
    });
  });

  describe('changeValue', () => {
    it('現在値を加算し変更ログ文字列を返す', () => {
      const result = accessor.changeValue('HP', 'now', 10);
      expect(result).toContain('テストキャラ');
      expect(result).toContain('150');
      expect(result).toContain('160');
      expect(accessor.getValue('HP', 'now')).toBe(160);
    });

    it('現在値を減算できる', () => {
      const result = accessor.changeValue('HP', 'now', -30);
      expect(result).toContain('150');
      expect(result).toContain('120');
      expect(accessor.getValue('HP', 'now')).toBe(120);
    });

    it('limitMaxがtrueで最大値を超えないように制限される', () => {
      const result = accessor.changeValue('HP', 'now', 100, false, true);
      expect(result).toContain('(最大)');
      expect(accessor.getValue('HP', 'now')).toBe(200);
    });

    it('limitMinがtrueで0未満にならないように制限される', () => {
      const result = accessor.changeValue('HP', 'now', -300, true);
      expect(result).toContain('(最小)');
      expect(accessor.getValue('HP', 'now')).toBe(0);
    });

    it('存在しない名前では空文字を返す', () => {
      expect(accessor.changeValue('不明', 'now', 10)).toBe('');
    });
  });
});
