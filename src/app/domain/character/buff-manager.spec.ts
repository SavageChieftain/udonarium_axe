import { ObjectStore } from '@axe/core/sync/object-store';
import { BuffManager } from '@axe/domain/character/buff-manager';
import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';

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
    it('adds a buff', () => {
      manager.addRound('マッスルベアー', '筋力+2', 3);

      const added = container.getFirstElementByName('マッスルベアー');
      expect(added).toBeTruthy();
      expect(added!.value).toBe(3);
      expect(added!.currentValue).toBe('筋力+2');
    });

    it('adds one for three rounds with no note', () => {
      manager.addRound('バフ名');

      const added = container.getFirstElementByName('バフ名');
      expect(added).toBeTruthy();
      expect(added!.value).toBe(3);
      expect(added!.currentValue).toBe('');
    });

    it('replaces one of the same name', () => {
      manager.addRound('猫目', 'A', 5);
      manager.addRound('猫目', 'B', 2);

      const buffs = container.getElementsByName('猫目');
      expect(buffs.length).toBeLessThanOrEqual(1);
      // the values of the old one are replaced
      const data = buffDataElement.getFirstElementByName('猫目');
      expect(data).toBeTruthy();
      expect(data!.value).toBe(2);
      expect(data!.currentValue).toBe('B');
    });

    it('gives it an icon and a colour when they are given', () => {
      manager.addRound('毒', '継続2', 3, { color: '#c62828', icon: '☠️' });

      const added = container.getFirstElementByName('毒')!;
      expect(added.getAttribute(DataElementAttribute.BUFF_COLOR)).toBe('#c62828');
      expect(added.getAttribute(DataElementAttribute.BUFF_ICON)).toBe('☠️');
    });

    it('repaints one that already has them', () => {
      manager.addRound('毒', '継続2', 3, { color: '#c62828', icon: '☠️' });
      manager.addRound('毒', '継続1', 1, { color: '#2e7d32' });

      const added = container.getFirstElementByName('毒')!;
      expect(added.getAttribute(DataElementAttribute.BUFF_COLOR)).toBe('#2e7d32');
      expect(added.getAttribute(DataElementAttribute.BUFF_ICON)).toBe('☠️');
    });

    it('puts the colour back to the default when an empty one is given', () => {
      manager.addRound('毒', '継続2', 3, { color: '#c62828' });
      manager.addRound('毒', '継続2', 3, { color: '' });

      const added = container.getFirstElementByName('毒')!;
      expect(added.getAttribute(DataElementAttribute.BUFF_COLOR)).toBe('');
    });
  });

  describe('delete', () => {
    it('removes a buff by name', () => {
      manager.addRound('削除対象', '', 3);
      expect(container.getFirstElementByName('削除対象')).toBeTruthy();

      const result = manager.delete('削除対象');
      expect(result).toBe(true);
      expect(container.getFirstElementByName('削除対象')).toBeFalsy();
    });

    it('is false for a name it does not have', () => {
      const result = manager.delete('存在しない');
      expect(result).toBe(false);
    });

    it('is false without a container', () => {
      const emptyBuff = DataElement.create('空バフ', '');
      const emptyManager = new BuffManager(emptyBuff);

      const result = emptyManager.delete('何か');
      expect(result).toBe(false);
    });
  });

  describe('decreaseRound', () => {
    it('counts every buff down a round', () => {
      manager.addRound('バフA', '', 5);
      manager.addRound('バフB', '', 3);

      manager.decreaseRound();

      const a = container.getFirstElementByName('バフA');
      const b = container.getFirstElementByName('バフB');
      expect(parseInt(a!.value as string)).toBe(4);
      expect(parseInt(b!.value as string)).toBe(2);
    });

    it('does not throw without one', () => {
      const emptyBuff = DataElement.create('空バフ', '');
      const emptyManager = new BuffManager(emptyBuff);
      expect(() => emptyManager.decreaseRound()).not.toThrow();
    });
  });

  describe('increaseRound', () => {
    it('counts every buff up a round', () => {
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
    it('counts them down, removes those that ran out and names them', () => {
      manager.addRound('続く', '', 3);
      manager.addRound('切れる', '', 1);

      expect(manager.expireOneRound()).toEqual(['切れる']);
      expect(container.getFirstElementByName('続く')!.value).toBe(2);
      expect(container.getFirstElementByName('切れる')).toBeFalsy();
    });

    it('a buff of three rounds lasts exactly three', () => {
      manager.addRound('3R', '', 3);

      expect(manager.expireOneRound()).toEqual([]);
      expect(manager.expireOneRound()).toEqual([]);
      expect(manager.expireOneRound()).toEqual(['3R']);
    });

    it('one already spent goes at once', () => {
      manager.addRound('0R', '', 0);

      expect(manager.expireOneRound()).toEqual(['0R']);
      expect(container.getFirstElementByName('0R')).toBeFalsy();
    });

    it('returns nothing when there are none', () => {
      expect(manager.expireOneRound()).toEqual([]);
    });

    it('does not throw without one', () => {
      const emptyManager = new BuffManager(DataElement.create('空バフ', ''));
      expect(() => emptyManager.expireOneRound()).not.toThrow();
      expect(emptyManager.expireOneRound()).toEqual([]);
    });
  });

  describe('deleteZeroRound', () => {
    it('removes a buff with no rounds left', () => {
      manager.addRound('残る', '', 2);
      manager.addRound('消える', '', 0);

      manager.deleteZeroRound();

      expect(container.getFirstElementByName('残る')).toBeTruthy();
      expect(container.getFirstElementByName('消える')).toBeFalsy();
    });

    it('removes one that has run past zero', () => {
      manager.addRound('マイナス', '', 1);
      manager.decreaseRound(); // 0
      manager.decreaseRound(); // -1

      manager.deleteZeroRound();

      expect(container.getFirstElementByName('マイナス')).toBeFalsy();
    });

    it('does not throw without one', () => {
      const emptyBuff = DataElement.create('空バフ', '');
      const emptyManager = new BuffManager(emptyBuff);
      expect(() => emptyManager.deleteZeroRound()).not.toThrow();
    });
  });
});
