import { SynchronizeRequest, SynchronizeTask } from '@axe/core/sync/synchronize-task';

describe('SynchronizeTask', () => {
  describe('create', () => {
    it('finishes at once when created with nothing to ask for', () => {
      return new Promise<void>((resolve) => {
        const task = SynchronizeTask.create('test-peer', []);
        task.onfinish = () => {
          resolve();
        };
      });
    });

    it('can be created with requests', () => {
      const requests: SynchronizeRequest[] = [{ identifier: 'obj1', version: 1, holderIds: ['peer1'], ttl: 3 }];
      const task = SynchronizeTask.create('test-peer', requests);
      expect(task).toBeTruthy();
    });
  });
});
