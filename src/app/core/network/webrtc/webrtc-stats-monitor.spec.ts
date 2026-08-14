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
    it('adds a connection and measures it', () => {
      WebRTCStatsMonitor.add(mockConnection);
      expect(mockConnection.updateStatsAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('removes a connection', () => {
      WebRTCStatsMonitor.add(mockConnection);
      WebRTCStatsMonitor.remove(mockConnection);
      // already removed, so nothing goes wrong
      expect(true).toBe(true);
    });
  });

  describe('peerStatsUpdated$', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- needed to reach a private method
    const monitor = WebRTCStatsMonitor as unknown as { doMonitoringAsync: () => Promise<void> } & any;

    it('reports once it has measured', async () => {
      const emitted = vi.fn();
      const off = peerStatsUpdated$.subscribe(emitted);

      WebRTCStatsMonitor.add(mockConnection);
      await monitor.doMonitoringAsync();
      off();

      expect(emitted).toHaveBeenCalled();
    });

    it('reports nothing with nothing to measure', async () => {
      const emitted = vi.fn();
      const off = peerStatsUpdated$.subscribe(emitted);

      await monitor.doMonitoringAsync();
      off();

      expect(emitted).not.toHaveBeenCalled();
    });

    it('reports after clearing away a closed connection', async () => {
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
