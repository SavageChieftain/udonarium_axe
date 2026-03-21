import { vi, describe, it, expect } from 'vitest';

vi.mock('@skyway-sdk/core', () => ({
  Logger: { level: '' },
}));

import { SkyWayFacade } from './skyway-facade';

describe('SkyWayFacade', () => {
  it('クラスがエクスポートされている', () => {
    expect(SkyWayFacade).toBeDefined();
  });

  it('初期状態のプロパティ', () => {
    const facade = new SkyWayFacade();
    expect(facade.url).toBe('');
    expect(facade.peer).toBeDefined();
    expect(facade.isOpen).toBe(false);
  });
});
