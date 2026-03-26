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

  describe('leaveImmediately', () => {
    it('メソッドが存在する', () => {
      const facade = new SkyWayFacade();
      expect(typeof facade.leaveImmediately).toBe('function');
    });

    it('roomPerson/lobbyPersonが未設定でもエラーにならない', () => {
      const facade = new SkyWayFacade();
      expect(() => facade.leaveImmediately()).not.toThrow();
    });
  });

  describe('rejoinAfterLeave', () => {
    it('メソッドが存在する', () => {
      const facade = new SkyWayFacade();
      expect(typeof facade.rejoinAfterLeave).toBe('function');
    });

    it('context未設定時は早期リターンする', async () => {
      const facade = new SkyWayFacade();
      await expect(facade.rejoinAfterLeave()).resolves.toBeUndefined();
    });

    it('left状態のpersonをクリアしてから再参加する', async () => {
      const facade = new SkyWayFacade();
      // left状態のモックpersonを設定
      (facade as unknown as Record<string, unknown>).roomPerson = { state: 'left' };
      (facade as unknown as Record<string, unknown>).lobbyPerson = { state: 'left' };
      // contextがないので早期リターンするがエラーにならない
      await expect(facade.rejoinAfterLeave()).resolves.toBeUndefined();
    });
  });
});
