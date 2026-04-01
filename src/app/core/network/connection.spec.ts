import { ConnectionCallback } from '@axe/core/network/connection';

describe('ConnectionCallback', () => {
  describe('constructor', () => {
    it('インスタンスを作成できる', () => {
      const callback = new ConnectionCallback();
      expect(callback).toBeTruthy();
    });

    it('各コールバックは初期状態でundefined', () => {
      const callback = new ConnectionCallback();
      expect(callback.onOpen).toBeUndefined();
      expect(callback.onClose).toBeUndefined();
      expect(callback.onConnect).toBeUndefined();
      expect(callback.onDisconnect).toBeUndefined();
      expect(callback.onData).toBeUndefined();
      expect(callback.onError).toBeUndefined();
    });

    it('コールバックを設定できる', () => {
      const callback = new ConnectionCallback();
      const fn = vi.fn();
      callback.onOpen = fn;
      expect(callback.onOpen).toBe(fn);
    });
  });
});
