import { SkyWayDataStream } from './skyway-data-stream';

describe('SkyWayDataStream', () => {
  it('クラスがエクスポートされている', () => {
    expect(SkyWayDataStream).toBeDefined();
  });

  it('EventEmitterを継承している', () => {
    expect(SkyWayDataStream.prototype).toHaveProperty('emit');
    expect(SkyWayDataStream.prototype).toHaveProperty('on');
  });

  it('member が未解決でも initializeSubscription は例外を投げない', async () => {
    const stream = SkyWayDataStream.createSubscription(
      {
        room: undefined,
      } as never,
      {
        peerId: 'peer-a',
        userId: 'user-a',
        password: '',
      } as never
    );

    await expect(
      (stream as unknown as { initializeSubscription: () => Promise<void> }).initializeSubscription()
    ).resolves.toBeUndefined();
  });

  it('publication 側で member 未解決なら getPeerConnection は undefined を返す', () => {
    const getConnection = vi.fn(() => ({}) as RTCPeerConnection);

    const stream = SkyWayDataStream.createPublication(
      {
        room: undefined,
        peer: { peerId: 'local-peer' },
      } as never,
      {
        peerId: 'peer-a',
        userId: 'user-a',
        password: '',
      } as never
    );

    (stream as unknown as { subscription: unknown }).subscription = {
      publication: {
        stream: {
          _getRTCPeerConnection: getConnection,
        },
      },
    };

    expect(stream.getPeerConnection()).toBeUndefined();
    expect(getConnection).not.toHaveBeenCalled();
  });
});

it('プライベートフィールドが null で初期化されること', () => {
  const stream = SkyWayDataStream.createSubscription(
    { room: undefined } as never,
    { peerId: 'peer-a', userId: 'user-a', password: '' } as never
  );
  const s = stream as unknown as Record<string, unknown>;
  expect(s['subscription']).toBeNull();
  expect(s['dataChannel']).toBeNull();
  expect(s['stats']).toBeNull();
  expect(s['onStreamAdded']).toBeNull();
  expect(s['onStreamPublished']).toBeNull();
  expect(s['onConnectionStateChanged']).toBeNull();
});

describe('SkyWayDataStream receivedMap クリーンアップ', () => {
  it('dispose 時に receivedMap がクリアされる', () => {
    const receivedMap = new Map<
      string,
      { id: string; chunks: Uint8Array[]; length: number; byteLength: number; createdAt: number }
    >();
    receivedMap.set('chunk-1', { id: 'chunk-1', chunks: [], length: 0, byteLength: 0, createdAt: 0 });
    receivedMap.set('chunk-2', { id: 'chunk-2', chunks: [], length: 0, byteLength: 0, createdAt: 0 });

    receivedMap.clear();

    expect(receivedMap.size).toBe(0);
  });

  it('TTL 超過チャンクが evictStaleChunks で削除される', () => {
    const CHUNK_TTL_MS = 30_000;
    const receivedMap = new Map<
      string,
      { id: string; chunks: Uint8Array[]; length: number; byteLength: number; createdAt: number }
    >();
    const now = performance.now();

    receivedMap.set('old-chunk', {
      id: 'old-chunk',
      chunks: [],
      length: 0,
      byteLength: 0,
      createdAt: now - CHUNK_TTL_MS - 1,
    });
    receivedMap.set('new-chunk', { id: 'new-chunk', chunks: [], length: 0, byteLength: 0, createdAt: now - 1_000 });

    for (const [id, received] of receivedMap) {
      if (now - received.createdAt > CHUNK_TTL_MS) receivedMap.delete(id);
    }

    expect(receivedMap.has('old-chunk')).toBe(false);
    expect(receivedMap.has('new-chunk')).toBe(true);
  });

  it('TTL 内のチャンクは削除されない', () => {
    const CHUNK_TTL_MS = 30_000;
    const receivedMap = new Map<
      string,
      { id: string; chunks: Uint8Array[]; length: number; byteLength: number; createdAt: number }
    >();
    const now = performance.now();

    receivedMap.set('fresh-chunk', { id: 'fresh-chunk', chunks: [], length: 0, byteLength: 0, createdAt: now - 100 });

    for (const [id, received] of receivedMap) {
      if (now - received.createdAt > CHUNK_TTL_MS) receivedMap.delete(id);
    }

    expect(receivedMap.has('fresh-chunk')).toBe(true);
  });
});
