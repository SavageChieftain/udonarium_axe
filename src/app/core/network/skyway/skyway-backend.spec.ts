import { SkyWayBackend } from '@axe/core/network/skyway/skyway-backend';
import { AuthToken, ChannelScope, nowInSec, SkyWayAuthToken, uuidV4 } from '@skyway-sdk/core';

/**
 * A stand-in that mints an auth token.
 *
 * **The secret must stay off the front end. Do not run this in production.**
 *
 * Minting the token in the browser puts the secret where any end user can read it,
 * which lets anyone create or join any channel or room they like.
 *
 * @param channelName the channel to connect to
 * @param peerId PeerId
 * @returns JWT
 */
export async function createSkyWayAuthTokenMock(channelName: string, peerId: string): Promise<string> {
  // a stand-in, so the application id and secret are fixed
  // in production the secret belongs on a server
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

  it('holds a url', () => {
    const backend = new SkyWayBackend('http://localhost:3000');
    expect(backend.url).toBe('http://localhost:3000');
  });

  it('reports alive on a good response', async () => {
    const backend = new SkyWayBackend('http://localhost:3000');
    const result = await backend.alive();
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('reports dead when the request fails', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const backend = new SkyWayBackend('http://localhost:3000');
    const result = await backend.alive();
    expect(result).toBe(false);
  });

  it('returns a token', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ token: 'test-token' }), { status: 200 }));
    const backend = new SkyWayBackend('http://localhost:3000');
    const token = await backend.createSkyWayAuthToken('channel', 'peer-1');
    expect(token).toBe('test-token');
  });

  it('asks with a json content type first', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ token: 'test-token' }), { status: 200 }));
    const backend = new SkyWayBackend('http://localhost:3000');
    await backend.createSkyWayAuthToken('channel', 'peer-1');
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('falls straight back to a plain request when the fetch throws, avoiding the preflight', async () => {
    fetchSpy
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'fallback-token' }), { status: 200 }));
    const backend = new SkyWayBackend('http://localhost:3000');
    const token = await backend.createSkyWayAuthToken('channel', 'peer-1');
    expect(token).toBe('fallback-token');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect((fetchSpy.mock.calls[0][1] as RequestInit).headers).toEqual({ 'Content-Type': 'application/json' });
    expect((fetchSpy.mock.calls[1][1] as RequestInit).headers).toBeUndefined();
  });

  it('returns nothing on a bad response', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('', { status: 400 }));
    const backend = new SkyWayBackend('http://localhost:3000');
    const token = await backend.createSkyWayAuthToken('channel', 'peer-1');
    expect(token).toBe('');
  });

  it('returns nothing when the request fails', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const backend = new SkyWayBackend('http://localhost:3000');
    const token = await backend.createSkyWayAuthToken('channel', 'peer-1');
    expect(token).toBe('');
  });

  it('resolves the api path under a subdirectory', async () => {
    const backend = new SkyWayBackend('https://example.com/backend');
    await backend.alive();
    const calledUrl = (fetchSpy.mock.calls[0][0] as URL).toString();
    expect(calledUrl).toBe('https://example.com/backend/v1/status');
  });

  it('resolves the api path under a subdirectory with a trailing slash', async () => {
    const backend = new SkyWayBackend('https://example.com/backend/');
    await backend.alive();
    const calledUrl = (fetchSpy.mock.calls[0][0] as URL).toString();
    expect(calledUrl).toBe('https://example.com/backend/v1/status');
  });

  // Three attempts of five seconds each and the two waits between them, with room to spare.
  // Bounded rather than every timer there is, so a repeat left running elsewhere in the worker
  // cannot spin here for ever.
  const EVERY_ATTEMPT_MS = 30_000;

  describe('retrying a token request through a cold start', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries past a single server error and succeeds', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('', { status: 503 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'warm-token' }), { status: 200 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      const promise = backend.createSkyWayAuthToken('channel', 'peer-1');
      await vi.advanceTimersByTimeAsync(EVERY_ATTEMPT_MS);

      await expect(promise).resolves.toBe('warm-token');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('retries past a single network failure and succeeds', async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'warm-token' }), { status: 200 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      const promise = backend.createSkyWayAuthToken('channel', 'peer-1');
      await vi.advanceTimersByTimeAsync(EVERY_ATTEMPT_MS);

      await expect(promise).resolves.toBe('warm-token');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('returns nothing after every attempt meets a server error', async () => {
      fetchSpy.mockResolvedValue(new Response('', { status: 503 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      const promise = backend.createSkyWayAuthToken('channel', 'peer-1');
      await vi.advanceTimersByTimeAsync(EVERY_ATTEMPT_MS);

      await expect(promise).resolves.toBe('');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('keeps to the plain request on the retries after falling back', async () => {
      fetchSpy
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(new Response('', { status: 503 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'warm-token' }), { status: 200 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      const promise = backend.createSkyWayAuthToken('channel', 'peer-1');
      await vi.advanceTimersByTimeAsync(EVERY_ATTEMPT_MS);

      await expect(promise).resolves.toBe('warm-token');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect((fetchSpy.mock.calls[1][1] as RequestInit).headers).toBeUndefined();
      expect((fetchSpy.mock.calls[2][1] as RequestInit).headers).toBeUndefined();
    });

    it('retries in the same form after a timeout rather than falling back', async () => {
      const abortError = new Error('signal is aborted without reason');
      abortError.name = 'AbortError';
      fetchSpy
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'json-token' }), { status: 200 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      const promise = backend.createSkyWayAuthToken('channel', 'peer-1');
      await vi.advanceTimersByTimeAsync(EVERY_ATTEMPT_MS);

      await expect(promise).resolves.toBe('json-token');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect((fetchSpy.mock.calls[1][1] as RequestInit).headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('goes back to the json content type when a plain request is refused for it', async () => {
      fetchSpy
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(new Response('', { status: 415 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'json-token' }), { status: 200 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      const promise = backend.createSkyWayAuthToken('channel', 'peer-1');
      await vi.advanceTimersByTimeAsync(EVERY_ATTEMPT_MS);

      await expect(promise).resolves.toBe('json-token');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect((fetchSpy.mock.calls[1][1] as RequestInit).headers).toBeUndefined();
      expect((fetchSpy.mock.calls[2][1] as RequestInit).headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('fails at once on a client error rather than retrying', async () => {
      fetchSpy.mockResolvedValue(new Response('', { status: 404 }));
      const backend = new SkyWayBackend('http://localhost:3000');

      await expect(backend.createSkyWayAuthToken('channel', 'peer-1')).resolves.toBe('');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
