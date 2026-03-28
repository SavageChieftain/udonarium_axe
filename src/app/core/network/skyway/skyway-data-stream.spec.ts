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
