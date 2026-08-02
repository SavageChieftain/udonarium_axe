import { ObjectStore } from '@axe/core/sync/object-store';
import { BuffManager } from '@axe/domain/character/buff-manager';
import { DataElement } from '@axe/domain/data/data-element';

describe('BuffManager', () => {
  let store: ObjectStore;
  let buffDataElement: DataElement;
  let container: DataElement;
  let manager: BuffManager;

  beforeEach(() => {
    store = ObjectStore.instance;

    buffDataElement = DataElement.create('バフ', '');
    container = DataElement.create('container', '');
    buffDataElement.appendChild(container);

    manager = new BuffManager(buffDataElement);
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('addRound', () => {
    it('新規バフを追加できる', () => {
      manager.addRound('マッスルベアー', '筋力+2', 3);

      const added = container.getFirstElementByName('マッスルベアー');
      expect(added).toBeTruthy();
      expect(added!.value).toBe(3);
      expect(added!.currentValue).toBe('筋力+2');
    });

    it('デフォルトではラウンド3・情報空文字で追加される', () => {
      manager.addRound('バフ名');

      const added = container.getFirstElementByName('バフ名');
      expect(added).toBeTruthy();
      expect(added!.value).toBe(3);
      expect(added!.currentValue).toBe('');
    });

    it('同名バフが既に存在する場合は上書きされる', () => {
      manager.addRound('猫目', 'A', 5);
      manager.addRound('猫目', 'B', 2);

      const buffs = container.getElementsByName('猫目');
      expect(buffs.length).toBeLessThanOrEqual(1);
      // 既存データの value/currentValue が上書き
      const data = buffDataElement.getFirstElementByName('猫目');
      expect(data).toBeTruthy();
      expect(data!.value).toBe(2);
      expect(data!.currentValue).toBe('B');
    });
  });

  describe('delete', () => {
    it('名前を指定してバフを削除できる', () => {
      manager.addRound('削除対象', '', 3);
      expect(container.getFirstElementByName('削除対象')).toBeTruthy();

      const result = manager.delete('削除対象');
      expect(result).toBe(true);
      expect(container.getFirstElementByName('削除対象')).toBeFalsy();
    });

    it('存在しないバフ名ではfalseを返す', () => {
      const result = manager.delete('存在しない');
      expect(result).toBe(false);
    });

    it('containerが無い場合はfalseを返す', () => {
      const emptyBuff = DataElement.create('空バフ', '');
      const emptyManager = new BuffManager(emptyBuff);

      const result = emptyManager.delete('何か');
      expect(result).toBe(false);
    });
  });

  describe('decreaseRound', () => {
    it('全バフのラウンドを1減少させる', () => {
      manager.addRound('バフA', '', 5);
      manager.addRound('バフB', '', 3);

      manager.decreaseRound();

      const a = container.getFirstElementByName('バフA');
      const b = container.getFirstElementByName('バフB');
      expect(parseInt(a!.value as string)).toBe(4);
      expect(parseInt(b!.value as string)).toBe(2);
    });

    it('containerが無い場合でもエラーにならない', () => {
      const emptyBuff = DataElement.create('空バフ', '');
      const emptyManager = new BuffManager(emptyBuff);
      expect(() => emptyManager.decreaseRound()).not.toThrow();
    });
  });

  describe('increaseRound', () => {
    it('全バフのラウンドを1増加させる', () => {
      manager.addRound('バフA', '', 2);
      manager.addRound('バフB', '', 4);

      manager.increaseRound();

      const a = container.getFirstElementByName('バフA');
      const b = container.getFirstElementByName('バフB');
      expect(parseInt(a!.value as string)).toBe(3);
      expect(parseInt(b!.value as string)).toBe(5);
    });
  });

  describe('expireOneRound', () => {
    it('残ラウンドを1減らし、尽きたバフだけを消して名前を返す', () => {
      manager.addRound('続く', '', 3);
      manager.addRound('切れる', '', 1);

      expect(manager.expireOneRound()).toEqual(['切れる']);
      expect(container.getFirstElementByName('続く')!.value).toBe(2);
      expect(container.getFirstElementByName('切れる')).toBeFalsy();
    });

    it('3ラウンドのバフはちょうど3回で切れる', () => {
      manager.addRound('3R', '', 3);

      expect(manager.expireOneRound()).toEqual([]);
      expect(manager.expireOneRound()).toEqual([]);
      expect(manager.expireOneRound()).toEqual(['3R']);
    });

    it('既に0以下のバフはその場で切れる', () => {
      manager.addRound('0R', '', 0);

      expect(manager.expireOneRound()).toEqual(['0R']);
      expect(container.getFirstElementByName('0R')).toBeFalsy();
    });

    it('バフが無ければ空配列を返す', () => {
      expect(manager.expireOneRound()).toEqual([]);
    });

    it('containerが無い場合でもエラーにならない', () => {
      const emptyManager = new BuffManager(DataElement.create('空バフ', ''));
      expect(() => emptyManager.expireOneRound()).not.toThrow();
      expect(emptyManager.expireOneRound()).toEqual([]);
    });
  });

  describe('deleteZeroRound', () => {
    it('ラウンド数が0以下のバフを削除する', () => {
      manager.addRound('残る', '', 2);
      manager.addRound('消える', '', 0);

      manager.deleteZeroRound();

      expect(container.getFirstElementByName('残る')).toBeTruthy();
      expect(container.getFirstElementByName('消える')).toBeFalsy();
    });

    it('ラウンド数がマイナスのバフも削除する', () => {
      manager.addRound('マイナス', '', 1);
      manager.decreaseRound(); // 0
      manager.decreaseRound(); // -1

      manager.deleteZeroRound();

      expect(container.getFirstElementByName('マイナス')).toBeFalsy();
    });

    it('containerが無い場合でもエラーにならない', () => {
      const emptyBuff = DataElement.create('空バフ', '');
      const emptyManager = new BuffManager(emptyBuff);
      expect(() => emptyManager.deleteZeroRound()).not.toThrow();
    });
  });
});
