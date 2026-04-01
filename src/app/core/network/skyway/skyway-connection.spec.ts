import { SkyWayConnection } from '@axe/core/network/skyway/skyway-connection';

describe('SkyWayConnection', () => {
  it('クラスがエクスポートされている', () => {
    expect(SkyWayConnection).toBeDefined();
  });

  it('初期プロパティが設定される', () => {
    const conn = new SkyWayConnection();
    expect(conn.callback).toBeDefined();
    expect(conn.bandwidthUsage).toBe(0);
  });

  describe('leaveImmediately', () => {
    it('メソッドが存在する', () => {
      const conn = new SkyWayConnection();
      expect(typeof conn.leaveImmediately).toBe('function');
    });

    it('未接続状態でもエラーにならない', () => {
      const conn = new SkyWayConnection();
      expect(() => conn.leaveImmediately()).not.toThrow();
    });
  });

  describe('rejoinAfterLeave', () => {
    it('メソッドが存在する', () => {
      const conn = new SkyWayConnection();
      expect(typeof conn.rejoinAfterLeave).toBe('function');
    });

    it('未接続状態でもエラーにならない', async () => {
      const conn = new SkyWayConnection();
      await expect(conn.rejoinAfterLeave()).resolves.toBeUndefined();
    });
  });
});
