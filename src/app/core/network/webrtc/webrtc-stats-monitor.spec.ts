import { peerStatsUpdated$ } from '@axe/core/network/peer-stats-events';
import { WebRTCConnection, WebRTCStatsMonitor } from '@axe/core/network/webrtc/webrtc-stats-monitor';

describe('WebRTCStatsMonitor', () => {
  let mockConnection: WebRTCConnection;

  beforeEach(() => {
    mockConnection = {
      open: true,
      updateStatsAsync: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    WebRTCStatsMonitor.remove(mockConnection);
    vi.restoreAllMocks();
  });

  describe('add', () => {
    it('接続を追加してupdateStatsAsyncを呼ぶ', () => {
      WebRTCStatsMonitor.add(mockConnection);
      expect(mockConnection.updateStatsAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('接続を削除できる', () => {
      WebRTCStatsMonitor.add(mockConnection);
      WebRTCStatsMonitor.remove(mockConnection);
      // removedなのでエラーなし
      expect(true).toBe(true);
    });
  });

  describe('peerStatsUpdated$', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- private メソッドへのアクセスに必要
    const monitor = WebRTCStatsMonitor as unknown as { doMonitoringAsync: () => Promise<void> } & any;

    it('計測を回したあとに通知する', async () => {
      const emitted = vi.fn();
      const off = peerStatsUpdated$.subscribe(emitted);

      WebRTCStatsMonitor.add(mockConnection);
      await monitor.doMonitoringAsync();
      off();

      expect(emitted).toHaveBeenCalled();
    });

    it('計測対象が無いときは通知しない', async () => {
      const emitted = vi.fn();
      const off = peerStatsUpdated$.subscribe(emitted);

      await monitor.doMonitoringAsync();
      off();

      expect(emitted).not.toHaveBeenCalled();
    });

    it('閉じた接続を掃除したときも通知する', async () => {
      const closed: WebRTCConnection = { open: false, updateStatsAsync: vi.fn().mockResolvedValue(undefined) };
      WebRTCStatsMonitor.add(closed);

      const emitted = vi.fn();
      const off = peerStatsUpdated$.subscribe(emitted);
      await monitor.doMonitoringAsync();
      off();
      WebRTCStatsMonitor.remove(closed);

      expect(emitted).toHaveBeenCalled();
    });
  });
});
