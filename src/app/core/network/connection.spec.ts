import { ConnectionCallback } from '@axe/core/network/connection';

describe('ConnectionCallback', () => {
  describe('constructor', () => {
    it('can be created', () => {
      const callback = new ConnectionCallback();
      expect(callback).toBeTruthy();
    });

    it('starts with none of its callbacks set', () => {
      const callback = new ConnectionCallback();
      expect(callback.onOpen).toBeUndefined();
      expect(callback.onClose).toBeUndefined();
      expect(callback.onConnect).toBeUndefined();
      expect(callback.onDisconnect).toBeUndefined();
      expect(callback.onData).toBeUndefined();
      expect(callback.onError).toBeUndefined();
    });

    it('takes the callbacks it is given', () => {
      const callback = new ConnectionCallback();
      const fn = vi.fn();
      callback.onOpen = fn;
      expect(callback.onOpen).toBe(fn);
    });
  });
});
