import { PromiseQueue } from '@axe/core/util/promise-queue';

describe('PromiseQueue', () => {
  describe('constructor', () => {
    it('初期lengthが0', () => {
      const queue = new PromiseQueue();
      expect(queue.length).toBe(0);
    });

    it('名前を指定できる', () => {
      const queue = new PromiseQueue('TestQueue');
      expect(queue.name).toBe('TestQueue');
    });

    it('デフォルト名が"Queue"', () => {
      const queue = new PromiseQueue();
      expect(queue.name).toBe('Queue');
    });
  });

  describe('add() - task関数', () => {
    it('関数タスクを追加して実行する', async () => {
      const queue = new PromiseQueue('test');
      let executed = false;

      await queue.add(() => {
        executed = true;
        return 'result';
      });

      expect(executed).toBe(true);
    });

    it('関数タスクの戻り値を返す', async () => {
      const queue = new PromiseQueue('test');
      const result = await queue.add(() => 42);
      expect(result).toBe(42);
    });

    it('タスク完了後にlengthが0に戻る', async () => {
      const queue = new PromiseQueue('test');
      await queue.add(() => 'done');
      // queueの内部処理が完了するのを待つ
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(queue.length).toBe(0);
    });
  });

  describe('add() - async task', () => {
    it('Promiseを返すタスクを追加して実行する', async () => {
      const queue = new PromiseQueue('test');
      const result = await queue.add(() => Promise.resolve('resolved'));
      expect(result).toBe('resolved');
    });
  });

  describe('順序保証', () => {
    it('タスクが順番に実行される', async () => {
      const queue = new PromiseQueue('test');
      const order: number[] = [];

      const p1 = queue.add(() => {
        order.push(1);
      });
      const p2 = queue.add(() => {
        order.push(2);
      });
      const p3 = queue.add(() => {
        order.push(3);
      });

      await Promise.all([p1, p2, p3]);
      expect(order).toEqual([1, 2, 3]);
    });

    it('非同期タスクも順番に実行される', async () => {
      const queue = new PromiseQueue('test');
      const order: number[] = [];

      const p1 = queue.add(
        () =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              order.push(1);
              resolve();
            }, 10);
          })
      );
      const p2 = queue.add(() => {
        order.push(2);
      });

      await Promise.all([p1, p2]);
      expect(order).toEqual([1, 2]);
    });
  });

  describe('エラーハンドリング', () => {
    it('タスクがエラーを投げても次のタスクは実行される', async () => {
      const queue = new PromiseQueue('test');
      let secondExecuted = false;

      try {
        await queue.add(() => {
          throw new Error('test error');
        });
      } catch {
        // エラーを無視
      }

      await queue.add(() => {
        secondExecuted = true;
      });

      expect(secondExecuted).toBe(true);
    });
  });
});
