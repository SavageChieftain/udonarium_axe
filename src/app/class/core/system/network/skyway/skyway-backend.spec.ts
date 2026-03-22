import { SkyWayBackend } from './skyway-backend';

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
});
