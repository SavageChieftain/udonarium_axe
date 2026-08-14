import { PromiseQueue } from '@axe/core/util/promise-queue';

describe('PromiseQueue', () => {
  describe('constructor', () => {
    it('starts empty', () => {
      const queue = new PromiseQueue();
      expect(queue.length).toBe(0);
    });

    it('takes the name it is given', () => {
      const queue = new PromiseQueue('TestQueue');
      expect(queue.name).toBe('TestQueue');
    });

    it('calls itself a queue by default', () => {
      const queue = new PromiseQueue();
      expect(queue.name).toBe('Queue');
    });
  });

  describe('adding a task', () => {
    it('adds a task and runs it', async () => {
      const queue = new PromiseQueue('test');
      let executed = false;

      await queue.add(() => {
        executed = true;
        return 'result';
      });

      expect(executed).toBe(true);
    });

    it('returns what the task returned', async () => {
      const queue = new PromiseQueue('test');
      const result = await queue.add(() => 42);
      expect(result).toBe(42);
    });

    it('empties once the task is done', async () => {
      const queue = new PromiseQueue('test');
      await queue.add(() => 'done');
      // wait for the queue to finish its work
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(queue.length).toBe(0);
    });
  });

  describe('add() - async task', () => {
    it('adds and runs a task that returns a promise', async () => {
      const queue = new PromiseQueue('test');
      const result = await queue.add(() => Promise.resolve('resolved'));
      expect(result).toBe('resolved');
    });
  });

  describe('the order it keeps', () => {
    it('runs the tasks in order', async () => {
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

    it('runs asynchronous tasks in order too', async () => {
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

  describe('when a task throws', () => {
    it('runs the next task after one throws', async () => {
      const queue = new PromiseQueue('test');
      let secondExecuted = false;

      try {
        await queue.add(() => {
          throw new Error('test error');
        });
      } catch {
        // ignore the error
      }

      await queue.add(() => {
        secondExecuted = true;
      });

      expect(secondExecuted).toBe(true);
    });
  });
});
