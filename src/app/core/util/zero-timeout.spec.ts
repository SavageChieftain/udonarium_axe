import { clearZeroTimeout, setZeroTimeout } from './zero-timeout';

describe('zero-timeout', () => {
  describe('setZeroTimeout()', () => {
    it('IDを返す', () => {
      const id = setZeroTimeout(() => {});
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('コールバックが非同期で実行される', async () => {
      let executed = false;
      setZeroTimeout(() => {
        executed = true;
      });

      expect(executed).toBe(false);
      // MessageChannelの非同期処理を待つ
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(executed).toBe(true);
    });

    it('複数のコールバックが順番に実行される', async () => {
      const order: number[] = [];
      setZeroTimeout(() => order.push(1));
      setZeroTimeout(() => order.push(2));
      setZeroTimeout(() => order.push(3));

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(order).toEqual([1, 2, 3]);
    });

    it('異なるIDを返す', () => {
      const id1 = setZeroTimeout(() => {});
      const id2 = setZeroTimeout(() => {});
      expect(id1).not.toBe(id2);
    });
  });

  describe('clearZeroTimeout()', () => {
    it('登録済みのコールバックをキャンセルする', async () => {
      let executed = false;
      const id = setZeroTimeout(() => {
        executed = true;
      });
      clearZeroTimeout(id);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(executed).toBe(false);
    });

    it('存在しないIDをクリアしてもエラーにならない', () => {
      expect(() => clearZeroTimeout(999999)).not.toThrow();
    });
  });
});
