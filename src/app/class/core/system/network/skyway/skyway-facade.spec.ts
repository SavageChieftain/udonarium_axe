import { SkyWayFacade } from './skyway-facade';

vi.mock('@skyway-sdk/core', () => ({
  Logger: { level: '' },
}));

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
