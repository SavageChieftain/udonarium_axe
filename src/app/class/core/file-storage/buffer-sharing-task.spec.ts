import { EventSystem } from '@axe/class/core/system';

import { BufferSharingTask } from './buffer-sharing-task';

describe('BufferSharingTask', () => {
  beforeEach(() => {
    const listenerMock = { on: vi.fn().mockReturnThis() };
    vi.spyOn(EventSystem, 'register').mockReturnValue(
      listenerMock as unknown as ReturnType<typeof EventSystem.register>
    );
    vi.spyOn(EventSystem, 'unregister');
    vi.spyOn(EventSystem, 'call');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSendTask', () => {
    it('送信タスクを作成できる', () => {
      const task = BufferSharingTask.createSendTask('test-id', 'peer-1', { foo: 'bar' });
      expect(task).toBeDefined();
      expect(task.identifier).toBe('test-id');
      expect(task.sendTo).toBe('peer-1');
    });
  });

  describe('createReceiveTask', () => {
    it('受信タスクを作成できる', () => {
      const task = BufferSharingTask.createReceiveTask('recv-id');
      expect(task).toBeDefined();
      expect(task.identifier).toBe('recv-id');
    });
  });

  describe('cancel', () => {
    it('キャンセル後にonfinishが呼ばれる', () => {
      const task = BufferSharingTask.createSendTask('cancel-id', 'peer-2', { a: 1 });
      const finishFn = vi.fn();
      const cancelFn = vi.fn();
      task.onfinish = finishFn;
      task.oncancel = cancelFn;

      task.start({ a: 1 });
      task.cancel();

      expect(cancelFn).toHaveBeenCalled();
      expect(finishFn).toHaveBeenCalled();
    });

    it('二重キャンセルしても安全', () => {
      const task = BufferSharingTask.createSendTask('double-cancel', 'peer-3');
      task.onfinish = vi.fn();
      task.oncancel = vi.fn();
      task.start({});
      task.cancel();
      task.cancel(); // 二重呼出
      expect(task.oncancel).toBeNull();
    });
  });
});
