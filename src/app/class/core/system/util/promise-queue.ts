export class PromiseQueue {
  private queue: Promise<unknown> = Promise.resolve();

  private _length: number = 0;
  get length(): number {
    return this._length;
  }

  constructor(readonly name: string = 'Queue') {}

  add<T>(task: () => T | PromiseLike<T>): Promise<T> {
    this._length++;
    console.log(`${this.name} add: ${this._length}`);
    this.queue = this.queue.then(task);

    const ret = this.queue as Promise<T>;
    this.queue = this.queue.catch((reason) => {
      console.error(reason);
    });
    this.queue = this.queue.then(() => {
      this._length--;
      console.log(`${this.name} done: ${this._length}`);
    });
    return ret;
  }
}
