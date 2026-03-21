import { vi, describe, it, expect } from 'vitest';

import { SkyWayConnection } from './skyway-connection';

describe('SkyWayConnection (skyway2023/)', () => {
  it('クラスがエクスポートされている', () => {
    expect(SkyWayConnection).toBeDefined();
  });

  it('初期プロパティが設定される', () => {
    const conn = new SkyWayConnection();
    expect(conn.callback).toBeDefined();
    expect(conn.bandwidthUsage).toBe(0);
  });
});
