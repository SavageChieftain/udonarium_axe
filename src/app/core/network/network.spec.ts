import { Network } from './network';

describe('Network', () => {
  beforeEach(() => {
    // シングルトンをリセットして他テストからの状態リークを防ぐ
    (Network as unknown as Record<string, unknown>)['_instance'] = undefined;
  });
  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      expect(Network.instance).toBe(Network.instance);
    });
  });

  describe('デフォルト状態', () => {
    it('isOpenのデフォルトはfalse', () => {
      expect(Network.instance.isOpen).toBe(false);
    });

    it('peerIdが設定済み', () => {
      expect(typeof Network.instance.peerId).toBe('string');
    });

    it('peerIdsが空配列', () => {
      expect(Network.instance.peerIds).toEqual([]);
    });

    it('peerがIPeerContext', () => {
      const peer = Network.instance.peer;
      expect(peer).toBeTruthy();
      expect(typeof peer.peerId).toBe('string');
    });

    it('peersが空配列', () => {
      expect(Network.instance.peers).toEqual([]);
    });

    it('bandwidthUsageが0', () => {
      expect(Network.instance.bandwidthUsage).toBe(0);
    });
  });

  describe('peerContext (後方互換)', () => {
    it('peerContextはpeerと同じ', () => {
      expect(Network.instance.peerContext).toBe(Network.instance.peer);
    });

    it('peerContextsはpeersと同値', () => {
      expect(Network.instance.peerContexts).toEqual(Network.instance.peers);
    });
  });

  describe('callback', () => {
    it('ConnectionCallbackインスタンスを持つ', () => {
      expect(Network.instance.callback).toBeTruthy();
    });
  });

  describe('beforeunload/unload/pagehideハンドラ', () => {
    it('callbackUnloadがプライベートフィールドとして存在する', () => {
      const instance = Network.instance as unknown as Record<string, unknown>;
      expect(typeof instance['callbackUnload']).toBe('function');
    });

    it('callbackBeforeUnloadがプライベートフィールドとして存在する', () => {
      const instance = Network.instance as unknown as Record<string, unknown>;
      expect(typeof instance['callbackBeforeUnload']).toBe('function');
    });

    it('callbackPageHideがプライベートフィールドとして存在する', () => {
      const instance = Network.instance as unknown as Record<string, unknown>;
      expect(typeof instance['callbackPageHide']).toBe('function');
    });

    it('callbackUnloadはconnection未設定でもエラーにならない', () => {
      const instance = Network.instance as unknown as Record<string, (...args: unknown[]) => void>;
      expect(() => instance['callbackUnload']()).not.toThrow();
    });

    it('callbackBeforeUnloadはconnection未設定でもエラーにならない', () => {
      const instance = Network.instance as unknown as Record<string, (...args: unknown[]) => void>;
      const event = { preventDefault: vi.fn() } as unknown as BeforeUnloadEvent;
      expect(() => instance['callbackBeforeUnload'](event)).not.toThrow();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('callbackPageHideはconnection未設定でもエラーにならない', () => {
      const instance = Network.instance as unknown as Record<string, (...args: unknown[]) => void>;
      expect(() => instance['callbackPageHide']({} as PageTransitionEvent)).not.toThrow();
    });

    it('callbackBeforeUnloadはleaveImmediatelyを呼ばない', () => {
      const instance = Network.instance as unknown as Record<string, unknown>;
      const leaveImmediately = vi.fn();
      instance['connection'] = { leaveImmediately } as unknown;
      const event = { preventDefault: vi.fn() } as unknown as BeforeUnloadEvent;
      (instance['callbackBeforeUnload'] as (e: BeforeUnloadEvent) => void)(event);
      expect(leaveImmediately).not.toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
      instance['connection'] = null;
    });

    it('callbackPageHideはleaveImmediatelyを呼ぶ', () => {
      const instance = Network.instance as unknown as Record<string, unknown>;
      const leaveImmediately = vi.fn();
      instance['connection'] = { leaveImmediately } as unknown;
      (instance['callbackPageHide'] as (e: PageTransitionEvent) => void)({} as PageTransitionEvent);
      expect(leaveImmediately).toHaveBeenCalled();
      instance['connection'] = null;
    });
  });
});
