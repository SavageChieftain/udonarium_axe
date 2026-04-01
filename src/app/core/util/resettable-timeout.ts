type TimerCallback = () => void;

export class ResettableTimeout {
  private callback: TimerCallback | null = null;
  private timerMilliSecond: number = 0;
  private timeoutDate: number = 0;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private isStopped: boolean = false;

  get isActive(): boolean {
    return this.timeoutTimer !== null;
  }

  constructor(callback: TimerCallback, ms: number) {
    this.callback = callback;
    this.timerMilliSecond = ms;
    this.reset();
  }

  stop() {
    this.isStopped = true;
  }

  clear() {
    this.callback = null;
    this.timerMilliSecond = 0;
    this.timeoutDate = 0;
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.timeoutTimer = null;
    this.isStopped = false;
  }

  reset(): void;
  reset(ms: number): void;
  reset(callback: TimerCallback, ms: number): void;
  reset(callbackOrMs?: TimerCallback | number, ms?: number): void {
    if (typeof callbackOrMs === 'function') {
      this.callback = callbackOrMs;
      this.timerMilliSecond = ms!;
    } else if (typeof callbackOrMs === 'number') {
      this.timerMilliSecond = callbackOrMs;
    }
    this.isStopped = false;

    const oldTimeoutDate = this.timeoutDate;
    this.timeoutDate = performance.now() + this.timerMilliSecond;

    if (this.timeoutTimer !== null && oldTimeoutDate <= this.timeoutDate) return;
    this.setTimeout();
  }

  private setTimeout() {
    if (this.timeoutTimer !== null) clearTimeout(this.timeoutTimer);
    this.timeoutTimer = null;
    if (!this.callback) return;

    this.timeoutTimer = setTimeout(() => {
      this.timeoutTimer = null;
      if (this.isStopped) return;

      if (performance.now() < this.timeoutDate) {
        this.setTimeout();
      } else {
        if (this.callback) this.callback();
      }
    }, this.timeoutDate - performance.now());
  }
}
