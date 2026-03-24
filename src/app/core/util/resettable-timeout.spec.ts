import { ResettableTimeout } from './resettable-timeout';

describe('ResettableTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('作成後にisActiveがtrueになる', () => {
      const callback = vi.fn();
      const timer = new ResettableTimeout(callback, 1000);
      expect(timer.isActive).toBe(true);
      timer.clear();
    });
  });

  describe('コールバック実行', () => {
    it('指定時間後にコールバックが呼ばれる', () => {
      const callback = vi.fn();
      const timer = new ResettableTimeout(callback, 1000);

      vi.advanceTimersByTime(999);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
      timer.clear();
    });

    it('コールバックは1回だけ呼ばれる', () => {
      const callback = vi.fn();
      const timer = new ResettableTimeout(callback, 500);

      vi.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(1);
      timer.clear();
    });
  });

  describe('stop()', () => {
    it('stopするとコールバックが呼ばれなくなる', () => {
      const callback = vi.fn();
      const timer = new ResettableTimeout(callback, 1000);
      timer.stop();

      vi.advanceTimersByTime(2000);
      expect(callback).not.toHaveBeenCalled();
      timer.clear();
    });
  });

  describe('clear()', () => {
    it('clearするとisActiveがfalseになる', () => {
      const callback = vi.fn();
      const timer = new ResettableTimeout(callback, 1000);
      timer.clear();

      expect(timer.isActive).toBe(false);
    });

    it('clearするとコールバックが呼ばれなくなる', () => {
      const callback = vi.fn();
      const timer = new ResettableTimeout(callback, 1000);
      timer.clear();

      vi.advanceTimersByTime(2000);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('reset()', () => {
    it('リセットするとタイムアウトが延長される', () => {
      const callback = vi.fn();
      const timer = new ResettableTimeout(callback, 1000);

      vi.advanceTimersByTime(800);
      timer.reset();

      vi.advanceTimersByTime(800);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1);
      timer.clear();
    });

    it('reset(ms) で時間を変更できる', () => {
      const callback = vi.fn();
      const timer = new ResettableTimeout(callback, 1000);

      timer.reset(500);

      vi.advanceTimersByTime(500);
      expect(callback).toHaveBeenCalledTimes(1);
      timer.clear();
    });

    it('reset(callback, ms) でコールバックと時間を変更できる', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const timer = new ResettableTimeout(callback1, 1000);

      timer.reset(callback2, 500);

      vi.advanceTimersByTime(500);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
      timer.clear();
    });

    it('stop後にresetすると再びアクティブになる', () => {
      const callback = vi.fn();
      const timer = new ResettableTimeout(callback, 1000);
      timer.stop();
      timer.reset();

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
      timer.clear();
    });
  });
});
