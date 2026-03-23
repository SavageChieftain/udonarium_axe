import { Logger } from '@axe/class/core/logger';

export class PromiseQueue {
  private queue: Promise<unknown> = Promise.resolve();

  private _length: number = 0;
  get length(): number {
    return this._length;
  }

  constructor(readonly name: string = 'Queue') {}

  add<T>(task: () => T | PromiseLike<T>): Promise<T> {
    this._length++;
    this.queue = this.queue.then(task);

    const ret = this.queue as Promise<T>;
    this.queue = this.queue.catch((reason) => {
      Logger.error(`[${this.name}] タスク実行エラー`, reason);
    });
    this.queue = this.queue.then(() => {
      this._length--;
    });
    return ret;
  }
}
