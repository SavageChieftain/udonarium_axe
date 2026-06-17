import { SkyWayBackend } from '@axe/core/network/skyway/skyway-backend';
import { AuthToken, ChannelScope, nowInSec, SkyWayAuthToken, uuidV4 } from '@skyway-sdk/core';

/**
 * SkyWayAuthTokenを生成するモック実装.
 *
 * **シークレットキーはフロントエンドでは秘匿されている必要があります. この実装を本番環境で運用しないでください.**
 *
 * サーバを構築せずにフロントエンドでSkyWayAuthTokenを生成した場合、
 * シークレットキーをエンドユーザが取得できるため、誰でも任意のChannelやRoomを生成して参加できる等のセキュリティ上の問題が発生します.
 *
 * @param channelName 接続するチャンネルの名称
 * @param peerId PeerId
 * @returns JWT
 */
export async function createSkyWayAuthTokenMock(channelName: string, peerId: string): Promise<string> {
  // モック実装のため、アプリケーションIDとシークレットキーは固定値
  // 本番環境ではシークレットキーをサーバなどに置いて秘匿する
  const _appId = '<SkyWay2023 Application ID>';
  const _secret = '<SkyWay2023 Secret key>';

  const lobbySize = 4;

  if (channelName.startsWith('udonarium-lobby-') || channelName.includes('*') || peerId.includes('*')) {
    throw new Error('Invalid Argument');
  }

  const channels: ChannelScope[] = [];
  const isPrivateRoom = channelName === peerId;

  channels.push({
    name: channelName,
    actions: isPrivateRoom ? ['read', 'create', 'updateMetadata'] : ['read', 'create'],
    members: [
      {
        name: peerId,
        actions: ['write'],
        publication: {
          actions: ['write'],
        },
        subscription: {
          actions: ['write'],
        },
      },
      {
        name: '*',
        actions: ['signal'],
      },
    ],
  });

  const lobbyName = `udonarium-lobby-*-of-${lobbySize}`;
  channels.push({
    name: lobbyName,
    actions: ['read', 'create'],
    members: [
      {
        name: peerId,
        actions: ['write'],
      },
    ],
  });

  const props = {
    jti: uuidV4(),
    iat: nowInSec(),
    exp: nowInSec() + 60 * 60 * 24,
    scope: {
      app: {
        id: _appId,
        turn: false,
        actions: ['read'],
        channels,
      },
    },
    version: 2,
  };

  const token = new SkyWayAuthToken(props as unknown as AuthToken).encode(_secret);

  return token;
}

describe('SkyWayBackend', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('URLを保持できる', () => {
    const backend = new SkyWayBackend('http://localhost:3000');
    expect(backend.url).toBe('http://localhost:3000');
  });

  it('alive が true を返す（200応答）', async () => {
    const backend = new SkyWayBackend('http://localhost:3000');
    const result = await backend.alive();
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('alive が false を返す（ネットワークエラー）', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const backend = new SkyWayBackend('http://localhost:3000');
    const result = await backend.alive();
    expect(result).toBe(false);
  });

  it('createSkyWayAuthToken がトークンを返す', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ token: 'test-token' }), { status: 200 }));
    const backend = new SkyWayBackend('http://localhost:3000');
    const token = await backend.createSkyWayAuthToken('channel', 'peer-1');
    expect(token).toBe('test-token');
  });

  it('createSkyWayAuthToken が空文字を返す（非200応答）', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('', { status: 400 }));
    const backend = new SkyWayBackend('http://localhost:3000');
    const token = await backend.createSkyWayAuthToken('channel', 'peer-1');
    expect(token).toBe('');
  });

  it('createSkyWayAuthToken が空文字を返す（ネットワークエラー）', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const backend = new SkyWayBackend('http://localhost:3000');
    const token = await backend.createSkyWayAuthToken('channel', 'peer-1');
    expect(token).toBe('');
  });

  it('サブディレクトリURLでもAPIパスが正しく解決される', async () => {
    const backend = new SkyWayBackend('https://example.com/backend');
    await backend.alive();
    const calledUrl = (fetchSpy.mock.calls[0][0] as URL).toString();
    expect(calledUrl).toBe('https://example.com/backend/v1/status');
  });

  it('末尾スラッシュ付きサブディレクトリURLでもAPIパスが正しく解決される', async () => {
    const backend = new SkyWayBackend('https://example.com/backend/');
    await backend.alive();
    const calledUrl = (fetchSpy.mock.calls[0][0] as URL).toString();
    expect(calledUrl).toBe('https://example.com/backend/v1/status');
  });

  describe('createSkyWayAuthToken のコールドスタート向けリトライ', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('5xx（コールドスタート）が一度起きてもリトライして成功する', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('', { status: 503 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'warm-token' }), { status: 200 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      const promise = backend.createSkyWayAuthToken('channel', 'peer-1');
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('warm-token');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('通信エラーが一度起きてもリトライして成功する', async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'warm-token' }), { status: 200 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      const promise = backend.createSkyWayAuthToken('channel', 'peer-1');
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('warm-token');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('一時失敗（5xx）が続くと全試行後に空文字を返す', async () => {
      fetchSpy.mockResolvedValue(new Response('', { status: 503 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      const promise = backend.createSkyWayAuthToken('channel', 'peer-1');
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('4xx（設定ミス）は即失敗しリトライしない', async () => {
      fetchSpy.mockResolvedValue(new Response('', { status: 404 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      await expect(backend.createSkyWayAuthToken('channel', 'peer-1')).resolves.toBe('');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
