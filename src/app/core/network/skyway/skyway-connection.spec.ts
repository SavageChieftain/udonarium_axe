import { SkyWayConnection } from '@axe/core/network/skyway/skyway-connection';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

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

  describe('onData relay timing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- private メソッドへのアクセスに必要
    let connAny: Record<string, any>;
    let mockStream: { peer: { peerId: string } };
    let callOrder: string[];

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- private メソッドへのアクセスに必要
      connAny = new SkyWayConnection() as any;
      mockStream = { peer: { peerId: 'peer-a' } };
      callOrder = [];
    });

    it('users付きコンテナはリレーマップ更新完了後にリレーする', async () => {
      let resolveUpdate!: () => void;
      const updatePromise = new Promise<void>((r) => {
        resolveUpdate = r;
      });

      vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => {
        return updatePromise.then(() => {
          callOrder.push('updateComplete');
        });
      });
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {
        callOrder.push('relay');
      });

      const container = { data: new Uint8Array(), users: ['user-c'], ttl: 1 };
      connAny.onData(mockStream, container);

      // onUpdateUserIds完了前はリレーが発生しない
      await flushMicrotasks();
      expect(callOrder).not.toContain('relay');

      // onUpdateUserIds完了後にリレーが発生する
      resolveUpdate();
      await flushMicrotasks();
      expect(callOrder).toEqual(['updateComplete', 'relay']);
    });

    it('更新保留中に到着したデータのみのコンテナもリレーマップ更新を待つ', async () => {
      let resolveUpdate!: () => void;
      const updatePromise = new Promise<void>((r) => {
        resolveUpdate = r;
      });

      vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => {
        return updatePromise.then(() => {
          callOrder.push('updateComplete');
        });
      });
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {
        callOrder.push('relay');
      });

      // 1つ目: users付きコンテナでpending登録
      connAny.onData(mockStream, { data: new Uint8Array(), users: ['user-c'], ttl: 1 });

      // 2つ目: usersなし・ttl>0のデータコンテナ
      connAny.onData(mockStream, { data: new Uint8Array(), ttl: 1 });

      await flushMicrotasks();
      expect(callOrder).not.toContain('relay');

      resolveUpdate();
      await flushMicrotasks();
      // updateComplete後に両方のリレーが発生
      expect(callOrder.filter((c) => c === 'relay')).toHaveLength(2);
    });

    it('保留中の更新がなければ即座にリレーする', () => {
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {
        callOrder.push('relay');
      });

      const container = { data: new Uint8Array(), ttl: 1 };
      connAny.onData(mockStream, container);

      expect(callOrder).toEqual(['relay']);
    });

    it('onUpdateUserIdsが失敗してもリレーは実行される', async () => {
      vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => {
        return Promise.reject(new Error('makeFriendPeer failed'));
      });
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {
        callOrder.push('relay');
      });

      const container = { data: new Uint8Array(), users: ['user-c'], ttl: 1 };
      connAny.onData(mockStream, container);

      await flushMicrotasks();
      expect(callOrder).toEqual(['relay']);
    });

    it('onUpdateUserIds完了後にpendingRelayMapUpdatesがクリーンアップされる', async () => {
      let resolveUpdate!: () => void;
      const updatePromise = new Promise<void>((r) => {
        resolveUpdate = r;
      });

      vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => updatePromise);
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {});

      const container = { data: new Uint8Array(), users: ['user-c'], ttl: 1 };
      connAny.onData(mockStream, container);

      expect(connAny.pendingRelayMapUpdates.has('peer-a')).toBe(true);

      resolveUpdate();
      await flushMicrotasks();

      expect(connAny.pendingRelayMapUpdates.has('peer-a')).toBe(false);
    });

    it('ttl: 0のコンテナはリレーしない', () => {
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {
        callOrder.push('relay');
      });

      const container = { data: new Uint8Array(), ttl: 0 };
      connAny.onData(mockStream, container);

      expect(callOrder).not.toContain('relay');
    });

    it('異なるピアのpending状態は独立しており互いに影響しない', async () => {
      let resolveA!: () => void;
      const pendingA = new Promise<void>((r) => {
        resolveA = r;
      });

      const mockStreamB = { peer: { peerId: 'peer-b' } };

      vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => pendingA);
      const relaySpy = vi.spyOn(connAny, 'onRelay').mockImplementation((_s: unknown, _c: unknown) => {
        callOrder.push(`relay:${(_s as typeof mockStream).peer.peerId}`);
      });

      // peer-a: users付きコンテナでpending状態にする
      connAny.onData(mockStream, { data: new Uint8Array(), users: ['user-x'], ttl: 1 });

      // peer-b: pendingなし → 即座にリレーされる
      connAny.onData(mockStreamB, { data: new Uint8Array(), ttl: 1 });

      expect(callOrder).toEqual(['relay:peer-b']);

      resolveA();
      await flushMicrotasks();
      expect(callOrder).toEqual(['relay:peer-b', 'relay:peer-a']);

      relaySpy.mockRestore();
    });

    it('同一ピアからのusers更新が連続到着した場合、新しい方が優先される', async () => {
      let resolveFirst!: () => void;
      let resolveSecond!: () => void;
      const firstUpdate = new Promise<void>((r) => {
        resolveFirst = r;
      });
      const secondUpdate = new Promise<void>((r) => {
        resolveSecond = r;
      });

      let callCount = 0;
      vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstUpdate : secondUpdate;
      });
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {
        callOrder.push('relay');
      });

      // 1つ目のusers更新
      connAny.onData(mockStream, { data: new Uint8Array(), users: ['user-c'], ttl: 1 });
      // 2つ目のusers更新（上書き）
      connAny.onData(mockStream, { data: new Uint8Array(), users: ['user-c', 'user-d'], ttl: 1 });

      // 1つ目が完了しても、pendingは2つ目を指しているのでクリーンアップされない
      resolveFirst();
      await flushMicrotasks();
      // 1つ目のリレーは発生する（1つ目のpending.thenで予約済み）
      expect(callOrder.filter((c) => c === 'relay').length).toBeGreaterThanOrEqual(1);
      expect(connAny.pendingRelayMapUpdates.has('peer-a')).toBe(true);

      resolveSecond();
      await flushMicrotasks();
      // 2つ目完了後にクリーンアップされる
      expect(connAny.pendingRelayMapUpdates.has('peer-a')).toBe(false);
      expect(callOrder.filter((c) => c === 'relay')).toHaveLength(2);
    });

    it('onUpdateUserIdsが失敗してもpendingRelayMapUpdatesがクリーンアップされる', async () => {
      vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => {
        return Promise.reject(new Error('network error'));
      });
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {});

      connAny.onData(mockStream, { data: new Uint8Array(), users: ['user-c'], ttl: 1 });

      expect(connAny.pendingRelayMapUpdates.has('peer-a')).toBe(true);

      await flushMicrotasks();

      expect(connAny.pendingRelayMapUpdates.has('peer-a')).toBe(false);
    });

    it('disconnectStreamがpendingRelayMapUpdatesをクリアする', async () => {
      let resolveUpdate!: () => void;
      const updatePromise = new Promise<void>((r) => {
        resolveUpdate = r;
      });

      vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => updatePromise);
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {});

      connAny.onData(mockStream, { data: new Uint8Array(), users: ['user-c'], ttl: 1 });
      expect(connAny.pendingRelayMapUpdates.has('peer-a')).toBe(true);

      // ストリーム切断をシミュレート
      const fakeStream = {
        peer: { peerId: 'peer-a' },
        disconnect: vi.fn(),
      };
      connAny.streams.remove = vi.fn().mockReturnValue(fakeStream);
      connAny.notifyUserList = vi.fn();
      connAny.disconnectStream(fakeStream);

      expect(connAny.pendingRelayMapUpdates.has('peer-a')).toBe(false);

      // 遅延resolveしてもcleanupの副作用なし
      resolveUpdate();
      await flushMicrotasks();
    });

    it('users: []（空配列）はonUpdateUserIdsを呼ばない', () => {
      const updateSpy = vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => Promise.resolve());
      vi.spyOn(connAny, 'onRelay').mockImplementation(() => {
        callOrder.push('relay');
      });

      connAny.onData(mockStream, { data: new Uint8Array(), users: [], ttl: 1 });

      expect(updateSpy).not.toHaveBeenCalled();
      expect(connAny.pendingRelayMapUpdates.has('peer-a')).toBe(false);
      // pendingなしなので即座にリレーされる
      expect(callOrder).toEqual(['relay']);
    });

    it('pending中に3つのコンテナが到着した場合、リレー順序が到着順で保持される', async () => {
      let resolveUpdate!: () => void;
      const updatePromise = new Promise<void>((r) => {
        resolveUpdate = r;
      });

      vi.spyOn(connAny, 'onUpdateUserIds').mockImplementation(() => updatePromise);

      const relayArgs: number[] = [];
      vi.spyOn(connAny, 'onRelay').mockImplementation((...args: unknown[]) => {
        relayArgs.push((args[1] as { seq: number }).seq);
      });

      // 1つ目: users付き
      connAny.onData(mockStream, { data: new Uint8Array(), users: ['user-c'], ttl: 1, seq: 1 });
      // 2つ目: データのみ
      connAny.onData(mockStream, { data: new Uint8Array(), ttl: 1, seq: 2 });
      // 3つ目: データのみ
      connAny.onData(mockStream, { data: new Uint8Array(), ttl: 1, seq: 3 });

      await flushMicrotasks();
      expect(relayArgs).toHaveLength(0);

      resolveUpdate();
      await flushMicrotasks();

      expect(relayArgs).toEqual([1, 2, 3]);
    });
  });
});
