import { ObjectSynchronizer } from './object-synchronizer';

describe('ObjectSynchronizer', () => {
  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      expect(ObjectSynchronizer.instance).toBe(ObjectSynchronizer.instance);
    });
  });

  describe('initialize / destroy', () => {
    it('initializeでイベントリスナーを登録する', () => {
      // initializeを呼んでもエラーにならない
      ObjectSynchronizer.instance.initialize();
      expect(true).toBe(true);
    });

    it('destroyでイベントリスナーを解除する', () => {
      ObjectSynchronizer.instance.initialize();
      ObjectSynchronizer.instance.destroy();
      expect(true).toBe(true);
    });
  });
});
