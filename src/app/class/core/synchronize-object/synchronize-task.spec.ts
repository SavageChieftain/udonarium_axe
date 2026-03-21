import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SynchronizeRequest, SynchronizeTask } from './synchronize-task';

describe('SynchronizeTask', () => {
  describe('create', () => {
    it('空のリクエストで作成するとすぐにfinishする', () => {
      return new Promise<void>((resolve) => {
        const task = SynchronizeTask.create('test-peer', []);
        task.onfinish = () => {
          resolve();
        };
      });
    });

    it('リクエスト付きで作成できる', () => {
      const requests: SynchronizeRequest[] = [{ identifier: 'obj1', version: 1, holderIds: ['peer1'], ttl: 3 }];
      const task = SynchronizeTask.create('test-peer', requests);
      expect(task).toBeTruthy();
    });
  });
});
