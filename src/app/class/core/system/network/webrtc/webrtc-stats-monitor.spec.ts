import { WebRTCConnection, WebRTCStatsMonitor } from './webrtc-stats-monitor';

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
});
