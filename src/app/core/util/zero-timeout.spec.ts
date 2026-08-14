import { clearZeroTimeout, setZeroTimeout, waitZeroTimeout } from '@axe/core/util/zero-timeout';

describe('zero-timeout', () => {
  describe('setZeroTimeout()', () => {
    it('returns an id', () => {
      const id = setZeroTimeout(() => {});
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('calls back later rather than at once', async () => {
      let executed = false;
      setZeroTimeout(() => {
        executed = true;
      });

      expect(executed).toBe(false);
      // wait for the message channel to come round
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(executed).toBe(true);
    });

    it('calls back in order', async () => {
      const order: number[] = [];
      setZeroTimeout(() => order.push(1));
      setZeroTimeout(() => order.push(2));
      setZeroTimeout(() => order.push(3));

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(order).toEqual([1, 2, 3]);
    });

    it('returns a different id each time', () => {
      const id1 = setZeroTimeout(() => {});
      const id2 = setZeroTimeout(() => {});
      expect(id1).not.toBe(id2);
    });
  });

  describe('clearZeroTimeout()', () => {
    it('cancels a registered callback', async () => {
      let executed = false;
      const id = setZeroTimeout(() => {
        executed = true;
      });
      clearZeroTimeout(id);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(executed).toBe(false);
    });

    it('survives clearing an id it does not know', () => {
      expect(() => clearZeroTimeout(999999)).not.toThrow();
    });
  });

  describe('waitZeroTimeout()', () => {
    it('returns a promise', () => {
      expect(waitZeroTimeout()).toBeInstanceOf(Promise);
    });

    it('resolves later rather than at once', async () => {
      let resolved = false;
      waitZeroTimeout().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(resolved).toBe(true);
    });
  });
});
