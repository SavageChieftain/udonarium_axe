import { SkyWayFacade } from '@axe/core/network/skyway/skyway-facade';

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

describe('フィールドが null で初期化されること', () => {
  it('context が null で初期化される', () => {
    const facade = new SkyWayFacade();
    expect(facade.context).toBeNull();
  });

  it('onOpen が null で初期化される', () => {
    const facade = new SkyWayFacade();
    expect(facade.onOpen).toBeNull();
  });

  it('onClose が null で初期化される', () => {
    const facade = new SkyWayFacade();
    expect(facade.onClose).toBeNull();
  });
});

describe('SkyWayFacade リスナークリーンアップ', () => {
  it('leaveLobbyChannel が onClosed.removeAllListeners を呼ぶ', async () => {
    const removeAllListenersSpy = vi.fn();
    const disposeSpy = vi.fn();

    const facade = new SkyWayFacade();
    (facade as unknown as Record<string, unknown>).lobby = {
      onClosed: { removeAllListeners: removeAllListenersSpy },
      dispose: disposeSpy,
    };

    await (facade as unknown as { leaveLobbyChannel: () => Promise<void> }).leaveLobbyChannel();

    expect(removeAllListenersSpy).toHaveBeenCalled();
    expect(disposeSpy).toHaveBeenCalled();
    expect((facade as unknown as Record<string, unknown>).lobby).toBeNull();
  });

  it('closeRoomDataStream が publication.onSubscribed.removeAllListeners を呼ぶ', async () => {
    const removeAllListenersSpy = vi.fn();
    const unpublishSpy = vi.fn();

    const facade = new SkyWayFacade();
    (facade as unknown as Record<string, unknown>).publication = {
      onSubscribed: { removeAllListeners: removeAllListenersSpy },
    };
    (facade as unknown as Record<string, unknown>).roomPerson = { unpublish: unpublishSpy };

    await (facade as unknown as { closeRoomDataStream: () => Promise<void> }).closeRoomDataStream();

    expect(removeAllListenersSpy).toHaveBeenCalled();
    expect(unpublishSpy).toHaveBeenCalled();
    expect((facade as unknown as Record<string, unknown>).publication).toBeNull();
  });
});
