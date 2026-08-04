import { PEER_RECONNECT_BACKOFF_MS, PeerReconnectScheduler } from '@axe/core/network/peer-reconnect-scheduler';

describe('PeerReconnectScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('既定のバックオフは単調増加する', () => {
    for (let i = 1; i < PEER_RECONNECT_BACKOFF_MS.length; i++) {
      expect(PEER_RECONNECT_BACKOFF_MS[i]).toBeGreaterThan(PEER_RECONNECT_BACKOFF_MS[i - 1]);
    }
  });

  it('予約した遅延の経過後にコールバックを実行する', () => {
    const scheduler = new PeerReconnectScheduler([100, 200]);
    const run = vi.fn();

    expect(scheduler.schedule('peer-a', run)).toBe(100);
    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('試行ごとに遅延が伸びる', () => {
    const scheduler = new PeerReconnectScheduler([100, 200, 400]);

    expect(scheduler.schedule('peer-a', () => {})).toBe(100);
    vi.advanceTimersByTime(100);
    expect(scheduler.schedule('peer-a', () => {})).toBe(200);
    vi.advanceTimersByTime(200);
    expect(scheduler.schedule('peer-a', () => {})).toBe(400);
  });

  it('バックオフを使い切ったら null を返して予約しない', () => {
    const scheduler = new PeerReconnectScheduler([100]);
    const run = vi.fn();

    expect(scheduler.schedule('peer-a', run)).toBe(100);
    vi.advanceTimersByTime(100);
    expect(run).toHaveBeenCalledTimes(1);

    expect(scheduler.schedule('peer-a', run)).toBeNull();
    vi.advanceTimersByTime(10000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('予約が残っている間は二重予約しない', () => {
    const scheduler = new PeerReconnectScheduler([100, 200]);
    const run = vi.fn();

    expect(scheduler.schedule('peer-a', run)).toBe(100);
    expect(scheduler.schedule('peer-a', run)).toBeNull();

    vi.advanceTimersByTime(100);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('ピアごとに試行回数が独立している', () => {
    const scheduler = new PeerReconnectScheduler([100, 200]);

    expect(scheduler.schedule('peer-a', () => {})).toBe(100);
    expect(scheduler.schedule('peer-b', () => {})).toBe(100);

    vi.advanceTimersByTime(100);
    expect(scheduler.schedule('peer-a', () => {})).toBe(200);
    expect(scheduler.attemptOf('peer-b')).toBe(1);
  });

  it('cancel は予約を取り消すが試行回数は残す', () => {
    const scheduler = new PeerReconnectScheduler([100, 200]);
    const run = vi.fn();

    scheduler.schedule('peer-a', run);
    scheduler.cancel('peer-a');

    vi.advanceTimersByTime(10000);
    expect(run).not.toHaveBeenCalled();
    expect(scheduler.attemptOf('peer-a')).toBe(1);
    expect(scheduler.schedule('peer-a', run)).toBe(200);
  });

  it('reset は予約と試行回数の両方を捨てる', () => {
    const scheduler = new PeerReconnectScheduler([100, 200]);
    const run = vi.fn();

    scheduler.schedule('peer-a', run);
    scheduler.reset('peer-a');

    vi.advanceTimersByTime(10000);
    expect(run).not.toHaveBeenCalled();
    expect(scheduler.attemptOf('peer-a')).toBe(0);
    expect(scheduler.schedule('peer-a', run)).toBe(100);
  });

  it('cancelAll は全ピアの予約と試行回数を捨てる', () => {
    const scheduler = new PeerReconnectScheduler([100, 200]);
    const run = vi.fn();

    scheduler.schedule('peer-a', run);
    scheduler.schedule('peer-b', run);
    expect(scheduler.scheduledPeerIds).toEqual(['peer-a', 'peer-b']);

    scheduler.cancelAll();

    vi.advanceTimersByTime(10000);
    expect(run).not.toHaveBeenCalled();
    expect(scheduler.scheduledPeerIds).toEqual([]);
    expect(scheduler.attemptOf('peer-a')).toBe(0);
  });

  it('発火後は予約済みでなくなる', () => {
    const scheduler = new PeerReconnectScheduler([100]);

    scheduler.schedule('peer-a', () => {});
    expect(scheduler.isScheduled('peer-a')).toBe(true);

    vi.advanceTimersByTime(100);
    expect(scheduler.isScheduled('peer-a')).toBe(false);
  });
});
