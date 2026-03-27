import { Logger, LogLevel } from '@axe/core/logger';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';

// ─── AudioContext mock ────────────────────────────────────────────────────────

type GainNodeMock = {
  gain: { setValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

type AudioBufferSourceNodeMock = {
  buffer: AudioBuffer | null;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
};

function makeGainNode(): GainNodeMock {
  return {
    gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function makeBufferSource(): AudioBufferSourceNodeMock {
  return {
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  };
}

function makeAudioContextMock() {
  const destination = {} as AudioDestinationNode;
  return {
    currentTime: 0,
    destination,
    resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => makeGainNode()),
    createMediaElementSource: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createBufferSource: vi.fn(() => makeBufferSource()),
    decodeAudioData: vi.fn(
      (_buf: ArrayBuffer, resolve: (b: AudioBuffer) => void, _reject: (e: DOMException) => void) => {
        resolve({ duration: 1 } as AudioBuffer);
      }
    ),
  };
}

// ─── HTMLAudioElement mock ────────────────────────────────────────────────────

type AudioElmMock = {
  volume: number;
  loop: boolean;
  paused: boolean;
  currentTime: number;
  src: string;
  onpause: (() => void) | null;
  onended: (() => void) | null;
  load: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
};

function makeAudioElm(): AudioElmMock {
  return {
    volume: 1,
    loop: false,
    paused: true,
    currentTime: 0,
    src: '',
    onpause: null,
    onended: null,
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

type AudioPlayerPrivateStatic = {
  _audioContext: unknown;
  _masterGainNode: unknown;
  _auditionGainNode: unknown;
  cacheMap: Map<string, { url: string; blob: Blob }>;
  MAX_CACHE_SIZE: number;
  evictCacheIfNeeded: () => void;
  createCacheAsync: (audio: AudioFile) => Promise<{ url: string; blob: Blob } | null>;
};

type AudioPlayerPrivateInstance = {
  _audioElm?: unknown;
};

const audioPlayerPrivate = AudioPlayer as unknown as AudioPlayerPrivateStatic;
const asAudioPlayerPrivate = (player: AudioPlayer): AudioPlayerPrivateInstance =>
  player as unknown as AudioPlayerPrivateInstance;

function resetStaticState() {
  // プライベート静的フィールドをリセットしてテスト間の干渉を防ぐ
  audioPlayerPrivate._audioContext = undefined;
  audioPlayerPrivate._masterGainNode = undefined;
  audioPlayerPrivate._auditionGainNode = undefined;
  audioPlayerPrivate.cacheMap.clear();
}

function makeAudioFile(opts: { blob?: Blob | null; url?: string; identifier?: string } = {}): AudioFile {
  const identifier = opts.identifier ?? 'test-id';
  const audio = AudioFile.createEmpty(identifier);
  const ctx = (audio as unknown as { context: Record<string, unknown> }).context;
  ctx['blob'] = opts.blob ?? null;
  ctx['url'] = opts.url ?? '';
  return audio;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('AudioPlayer', () => {
  let audioCtxMock: ReturnType<typeof makeAudioContextMock>;
  let audioElmMock: AudioElmMock;

  beforeEach(() => {
    Logger.setLevel(LogLevel.DEBUG);

    audioCtxMock = makeAudioContextMock();
    audioElmMock = makeAudioElm();

    // `new AudioContext()` → audioCtxMock を返すコンストラクタ
    // アロー関数は new で使えないので通常の function を使う
    const capturedCtx = audioCtxMock;
    function AudioContextCtor(this: unknown) {
      return capturedCtx;
    }
    vi.stubGlobal('AudioContext', AudioContextCtor);
    vi.stubGlobal('webkitAudioContext', AudioContextCtor);

    // `new Audio()` → audioElmMock を返すコンストラクタ
    const capturedElm = audioElmMock;
    function AudioCtor(this: unknown) {
      return capturedElm;
    }
    vi.stubGlobal('Audio', AudioCtor);

    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);

    resetStaticState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ─── VolumeType enum ─────────────────────────────────────────────────────

  describe('VolumeType', () => {
    it('MASTER は 0', () => {
      expect(VolumeType.MASTER).toBe(0);
    });
    it('AUDITION は 1', () => {
      expect(VolumeType.AUDITION).toBe(1);
    });
  });

  // ─── static audioContext ─────────────────────────────────────────────────

  describe('static audioContext', () => {
    it('初回アクセスで AudioContext を生成する', () => {
      const ctx = AudioPlayer.audioContext;
      expect(ctx).toBe(audioCtxMock);
    });

    it('2回目以降は同じインスタンスを返す', () => {
      const a = AudioPlayer.audioContext;
      const b = AudioPlayer.audioContext;
      expect(a).toBe(b);
    });

    it('window.AudioContext がなければ webkitAudioContext を使う', () => {
      vi.stubGlobal('AudioContext', undefined);
      const capturedCtx = audioCtxMock;
      let callCount = 0;
      function webkitCtor(this: unknown) {
        callCount++;
        return capturedCtx;
      }
      vi.stubGlobal('webkitAudioContext', webkitCtor);
      const ctx = AudioPlayer.audioContext;
      expect(ctx).toBe(audioCtxMock);
      expect(callCount).toBe(1);
    });
  });

  // ─── static volume ───────────────────────────────────────────────────────

  describe('static volume', () => {
    it('デフォルトは 0.5', () => {
      expect(AudioPlayer.volume).toBe(0.5);
    });

    it('セットすると masterGainNode に反映される', () => {
      AudioPlayer.volume = 0.8;
      expect(AudioPlayer.volume).toBe(0.8);
      const gainNode = audioCtxMock.createGain.mock.results[0].value as GainNodeMock;
      expect(gainNode.gain.setTargetAtTime).toHaveBeenCalledWith(0.8, 0, 0.01);
    });
  });

  // ─── static auditionVolume ───────────────────────────────────────────────

  describe('static auditionVolume', () => {
    it('デフォルトは 0.5', () => {
      expect(AudioPlayer.auditionVolume).toBe(0.5);
    });

    it('セットすると auditionGainNode に反映される', () => {
      AudioPlayer.auditionVolume = 0.3;
      expect(AudioPlayer.auditionVolume).toBe(0.3);
      // setter が auditionGainNode ゲッターを直接呼ぶので 0番目が audition の createGain
      const gainNode = audioCtxMock.createGain.mock.results[0].value as GainNodeMock;
      expect(gainNode.gain.setTargetAtTime).toHaveBeenCalledWith(0.3, 0, 0.01);
    });
  });

  // ─── static rootNode / auditionNode ──────────────────────────────────────

  describe('static rootNode', () => {
    it('masterGainNode を返す', () => {
      const node = AudioPlayer.rootNode;
      expect(audioCtxMock.createGain).toHaveBeenCalledOnce();
      expect(node).toBeDefined();
    });
  });

  describe('static auditionNode', () => {
    it('auditionGainNode を返す', () => {
      const node = AudioPlayer.auditionNode;
      expect(node).toBeDefined();
    });
  });

  // ─── constructor ─────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('audio なしで構築できる', () => {
      const player = new AudioPlayer();
      expect(player.audio).toBeUndefined();
    });

    it('audio ありで構築できる', () => {
      const af = makeAudioFile();
      const player = new AudioPlayer(af);
      expect(player.audio).toBe(af);
    });
  });

  // ─── instance volume / loop / paused ─────────────────────────────────────

  describe('instance volume', () => {
    it('要素未生成時はバッキング値を返す', () => {
      const player = new AudioPlayer();
      expect(player.volume).toBe(1);
    });

    it('セットするとバッキング値が変わる', () => {
      const player = new AudioPlayer();
      player.volume = 0.5;
      expect(player.volume).toBe(0.5);
      // まだ要素は生成されていない（_audioElm は undefined のまま）
      expect(asAudioPlayerPrivate(player)._audioElm).toBeUndefined();
    });

    it('要素生成後はセットが audioElm にも反映される', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'v1' });
      player.play(af);
      player.volume = 0.3;
      expect(audioElmMock.volume).toBe(0.3);
      expect(player.volume).toBe(0.3);
    });
  });

  describe('instance loop', () => {
    it('要素未生成時はバッキング値(false)を返す', () => {
      const player = new AudioPlayer();
      expect(player.loop).toBe(false);
    });

    it('セットするとバッキング値が変わる', () => {
      const player = new AudioPlayer();
      player.loop = true;
      expect(player.loop).toBe(true);
      // まだ要素は生成されていない（_audioElm は undefined のまま）
      expect(asAudioPlayerPrivate(player)._audioElm).toBeUndefined();
    });

    it('要素生成後はセットが audioElm にも反映される', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'lp1' });
      player.play(af);
      player.loop = true;
      expect(audioElmMock.loop).toBe(true);
    });
  });

  describe('instance paused', () => {
    it('要素未生成時は true を返す', () => {
      const player = new AudioPlayer();
      expect(player.paused).toBe(true);
    });

    it('要素生成後は audioElm.paused を返す', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'ps1' });
      audioElmMock.paused = false;
      player.play(af);
      expect(player.paused).toBe(false);
    });
  });

  // ─── play / pause / stop ─────────────────────────────────────────────────

  describe('play()', () => {
    it('audio が未設定でも audio 引数があれば再生する', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['data']), identifier: 'p1' });
      player.play(af);
      expect(audioElmMock.play).toHaveBeenCalledOnce();
    });

    it('audio も引数もなければ何もしない', () => {
      const player = new AudioPlayer();
      player.play();
      expect(audioElmMock.play).not.toHaveBeenCalled();
    });

    it('play() 前に stop() を呼ぶ', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['data']), identifier: 'p2' });
      player.play(af); // 1回目で要素生成
      player.play(); // 2回目: stop → play
      expect(audioElmMock.pause).toHaveBeenCalled();
    });

    it('AudioState.URL でキャッシュがあれば cachedUrl を使う', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ url: 'http://example.com/a.mp3', identifier: 'cached' });
      audioPlayerPrivate.cacheMap.set('cached', { url: 'blob:cached-url', blob: new Blob() });
      player.play(af);
      expect(audioElmMock.src).toBe('blob:cached-url');
    });

    it('AudioState.URL でキャッシュがなければ createCacheAsync を呼ぶ', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ url: 'http://example.com/b.mp3', identifier: 'nc' });
      type WithCreateCacheAsync = { createCacheAsync: (audio: AudioFile) => Promise<null> };
      const spy = vi.spyOn(AudioPlayer as unknown as WithCreateCacheAsync, 'createCacheAsync').mockResolvedValue(null);
      player.play(af);
      expect(spy).toHaveBeenCalledWith(af);
    });

    it('AudioState.URL で壊れたキャッシュ値(undefined)があっても例外を投げず元URLで再生できる', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ url: 'http://example.com/broken.mp3', identifier: 'broken-cache' });
      const brokenCacheMap = audioPlayerPrivate.cacheMap as unknown as Map<
        string,
        { url: string; blob: Blob } | undefined
      >;
      type WithCreateCacheAsync = { createCacheAsync: (audio: AudioFile) => Promise<null> };
      vi.spyOn(AudioPlayer as unknown as WithCreateCacheAsync, 'createCacheAsync').mockResolvedValue(null);
      brokenCacheMap.set('broken-cache', undefined);

      expect(() => player.play(af)).not.toThrow();
      expect(audioElmMock.src).toBe('http://example.com/broken.mp3');
    });

    it('play() は volumeType AUDITION で auditionNode に接続する', () => {
      const player = new AudioPlayer();
      player.volumeType = VolumeType.AUDITION;
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'aud' });
      // play() 前に auditionNode を参照して gainNode インスタンスを先に取得
      const auditionNodeRef = AudioPlayer.auditionNode;
      player.play(af);
      const src = audioCtxMock.createMediaElementSource.mock.results[0].value;
      expect(src.connect).toHaveBeenCalledWith(auditionNodeRef);
    });

    it('play() は volumeType MASTER で rootNode に接続する', () => {
      const player = new AudioPlayer();
      player.volumeType = VolumeType.MASTER;
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'mst' });
      player.play(af);
      const src = audioCtxMock.createMediaElementSource.mock.results[0].value;
      const masterGain = audioCtxMock.createGain.mock.results[0].value as GainNodeMock;
      expect(src.connect).toHaveBeenCalledWith(masterGain);
    });

    it('audioElm 生成時に _volume と _loop がセットされる', () => {
      const player = new AudioPlayer();
      player.volume = 0.6;
      player.loop = true;
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'init' });
      player.play(af);
      expect(audioElmMock.volume).toBe(0.6);
      expect(audioElmMock.loop).toBe(true);
    });

    it('audioElm.play() が reject した場合は Logger.warn を呼ぶ', async () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'playerr' });
      audioElmMock.play = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      player.play(af);
      await vi.waitFor(() => expect(warnSpy).toHaveBeenCalled());
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[AudioPlayer]'), expect.any(Error));
    });
  });

  describe('pause()', () => {
    it('要素未生成時は何もしない', () => {
      const player = new AudioPlayer();
      expect(() => player.pause()).not.toThrow();
      // まだ要素は生成されていない
      expect(asAudioPlayerPrivate(player)._audioElm).toBeUndefined();
    });

    it('要素生成後は audioElm.pause() を呼ぶ', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'pa1' });
      player.play(af);
      player.pause();
      expect(audioElmMock.pause).toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('要素未生成時は何もしない', () => {
      const player = new AudioPlayer();
      expect(() => player.stop()).not.toThrow();
    });

    it('要素生成後は pause, currentTime=0, src="", load, disconnect を呼ぶ', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'st1' });
      player.play(af); // 要素生成
      player.stop();
      expect(audioElmMock.pause).toHaveBeenCalled();
      expect(audioElmMock.currentTime).toBe(0);
      expect(audioElmMock.src).toBe('');
      expect(audioElmMock.load).toHaveBeenCalled();
    });

    it('onpause イベントで mediaElementSource が disconnect される', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'st2' });
      player.play(af);
      const src = audioCtxMock.createMediaElementSource.mock.results[0].value;
      // onpause を手動発火
      audioElmMock.onpause?.();
      expect(src.disconnect).toHaveBeenCalled();
    });

    it('onended イベントで mediaElementSource が disconnect される', () => {
      const player = new AudioPlayer();
      const af = makeAudioFile({ blob: new Blob(['x']), identifier: 'st3' });
      player.play(af);
      const src = audioCtxMock.createMediaElementSource.mock.results[0].value;
      audioElmMock.onended?.();
      expect(src.disconnect).toHaveBeenCalled();
    });
  });

  // ─── static play (playBufferAsync) ───────────────────────────────────────

  describe('static play()', () => {
    it('blob があれば AudioBufferSourceNode を開始する', async () => {
      const blob = new Blob(['audio-data']);
      const af = makeAudioFile({ blob, identifier: 'sp1' });

      AudioPlayer.play(af, 0.8);
      // playBufferAsync は fire-and-forget なので Promise 解決まで待つ
      await vi.waitFor(() => {
        const src = audioCtxMock.createBufferSource.mock.results[0]?.value as AudioBufferSourceNodeMock | undefined;
        expect(src?.start).toHaveBeenCalled();
      });
    });

    it('blob がなく url もなければ source を開始しない', async () => {
      const af = makeAudioFile({ identifier: 'sp2' });
      AudioPlayer.play(af);
      await new Promise((r) => setTimeout(r, 0));
      expect(audioCtxMock.createBufferSource).not.toHaveBeenCalled();
    });

    it('source.onended コールバックで stop/disconnect/buffer=null が呼ばれる', async () => {
      const blob = new Blob(['audio-data']);
      const af = makeAudioFile({ blob, identifier: 'sp3' });

      AudioPlayer.play(af);
      await vi.waitFor(() => {
        const src = audioCtxMock.createBufferSource.mock.results[0]?.value as AudioBufferSourceNodeMock | undefined;
        expect(src?.start).toHaveBeenCalled();
      });

      const src = audioCtxMock.createBufferSource.mock.results[0].value as AudioBufferSourceNodeMock;
      src.onended?.();
      expect(src.stop).toHaveBeenCalled();
      expect(src.disconnect).toHaveBeenCalled();
      expect(src.buffer).toBeNull();
    });

    it('AudioState.URL でキャッシュがあれば fetch しない', async () => {
      const blob = new Blob(['cached']);
      const af = makeAudioFile({ url: 'http://example.com/c.mp3', identifier: 'sp4' });
      audioPlayerPrivate.cacheMap.set('sp4', { url: 'blob:cached', blob });

      AudioPlayer.play(af);
      await vi.waitFor(() => {
        expect(audioCtxMock.createBufferSource.mock.results[0]?.value).toBeDefined();
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('AudioState.URL でキャッシュが未存在なら createCacheAsync を呼ぶ', async () => {
      const af = makeAudioFile({ url: 'http://example.com/d.mp3', identifier: 'sp5' });
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
      vi.stubGlobal('fetch', mockFetch);

      AudioPlayer.play(af);
      await vi.waitFor(() => {
        expect(audioCtxMock.createBufferSource.mock.results[0]?.value).toBeDefined();
      });
      expect(mockFetch).toHaveBeenCalledWith('http://example.com/d.mp3');
    });

    it('createCacheAsync が null を返した場合は source を開始しない', async () => {
      const af = makeAudioFile({ url: 'http://example.com/e.mp3', identifier: 'sp7' });
      type WithCreateCacheAsync = { createCacheAsync: (audio: AudioFile) => Promise<null> };
      vi.spyOn(AudioPlayer as unknown as WithCreateCacheAsync, 'createCacheAsync').mockResolvedValue(null);

      AudioPlayer.play(af);
      await new Promise((r) => setTimeout(r, 10));
      expect(audioCtxMock.createBufferSource).not.toHaveBeenCalled();
    });

    it('decodeAudioData が失敗した場合は null を返して source を開始しない', async () => {
      const blob = new Blob(['bad-data']);
      const af = makeAudioFile({ blob, identifier: 'sp6' });
      audioCtxMock.decodeAudioData.mockImplementation(
        (_buf: ArrayBuffer, _resolve: (b: AudioBuffer) => void, reject: (e: DOMException) => void) => {
          reject(new DOMException('decode error'));
        }
      );

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      AudioPlayer.play(af);
      await vi.waitFor(() => expect(warnSpy).toHaveBeenCalled());
      // decodeAudioData が失敗した場合、createBufferSource はまだ呼ばれていない
      expect(audioCtxMock.createBufferSource).not.toHaveBeenCalled();
    });
  });

  // ─── static resumeAudioContext ───────────────────────────────────────────

  describe('static resumeAudioContext()', () => {
    it('touchstart で audioContext.resume() を呼び、リスナーを削除する', () => {
      const listeners: Record<string, EventListenerOrEventListenerObject> = {};
      vi.spyOn(document, 'addEventListener').mockImplementation((type, listener) => {
        listeners[type] = listener as EventListenerOrEventListenerObject;
      });
      const removeSpy = vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});

      AudioPlayer.resumeAudioContext();

      const callback = listeners['touchstart'] as EventListener;
      callback(new Event('touchstart'));

      expect(audioCtxMock.resume).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalledWith('touchstart', callback, true);
      expect(removeSpy).toHaveBeenCalledWith('mousedown', callback, true);
    });

    it('mousedown でも同様に動作する', () => {
      const listeners: Record<string, EventListenerOrEventListenerObject> = {};
      vi.spyOn(document, 'addEventListener').mockImplementation((type, listener) => {
        listeners[type] = listener as EventListenerOrEventListenerObject;
      });
      vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      AudioPlayer.resumeAudioContext();

      const callback = listeners['mousedown'] as EventListener;
      callback(new Event('mousedown'));

      expect(audioCtxMock.resume).toHaveBeenCalled();
    });
  });

  // ─── getBlobAsync (createCacheAsync 経由) ─────────────────────────────────

  describe('getBlobAsync (via createCacheAsync)', () => {
    it('fetch が ok でない場合は console.error が呼ばれ null を返す', async () => {
      const af = makeAudioFile({ url: 'http://example.com/fail.mp3', identifier: 'gb1' });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await audioPlayerPrivate.createCacheAsync(af);
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('url が空で blob もなければ throw する', async () => {
      const af = makeAudioFile({ identifier: 'gb2' }); // url='', blob=null
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await audioPlayerPrivate.createCacheAsync(af);
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('blob が既にある場合は fetch を呼ばずに blob を返す', async () => {
      const blob = new Blob(['data']);
      const af = makeAudioFile({ blob, identifier: 'gb3' });

      const result = await audioPlayerPrivate.createCacheAsync(af);
      expect(result).not.toBeNull();
      expect(result?.blob).toBe(blob);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('同一 identifier のキャッシュが既にあれば既存を返す', async () => {
      const blob = new Blob(['data']);
      const af = makeAudioFile({ blob, identifier: 'gb4' });
      const existingCache = { url: 'blob:existing', blob: new Blob(['existing']) };
      audioPlayerPrivate.cacheMap.set('gb4', existingCache);

      const result = await audioPlayerPrivate.createCacheAsync(af);
      expect(result).toBe(existingCache);
    });

    it('成功時は cacheMap に登録される', async () => {
      const blob = new Blob(['data']);
      const af = makeAudioFile({ blob, identifier: 'gb5' });

      await audioPlayerPrivate.createCacheAsync(af);
      expect(audioPlayerPrivate.cacheMap.has('gb5')).toBe(true);
    });
  });

  describe('removeCache()', () => {
    it('指定identifierのキャッシュを削除しURLを解放する', () => {
      const cache = { url: 'blob:test-url', blob: new Blob(['data']) };
      audioPlayerPrivate.cacheMap.set('remove-test', cache);

      AudioPlayer.removeCache('remove-test');

      expect(audioPlayerPrivate.cacheMap.has('remove-test')).toBe(false);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('存在しないidentifierを指定しても安全に動作する', () => {
      expect(() => AudioPlayer.removeCache('nonexistent')).not.toThrow();
    });
  });

  describe('clearAllCache()', () => {
    it('全てのキャッシュを削除しURLを解放する', () => {
      const cache1 = { url: 'blob:url-1', blob: new Blob(['data1']) };
      const cache2 = { url: 'blob:url-2', blob: new Blob(['data2']) };
      audioPlayerPrivate.cacheMap.set('clear-1', cache1);
      audioPlayerPrivate.cacheMap.set('clear-2', cache2);

      AudioPlayer.clearAllCache();

      expect(audioPlayerPrivate.cacheMap.size).toBe(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url-1');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url-2');
    });
  });

  describe('cache eviction', () => {
    it('キャッシュがMAX_CACHE_SIZEを超えた時に古いエントリを削除する', async () => {
      const maxSize = audioPlayerPrivate.MAX_CACHE_SIZE;

      // Fill cache to max
      for (let i = 0; i < maxSize + 5; i++) {
        const cache = { url: `blob:url-${i}`, blob: new Blob([`data-${i}`]) };
        audioPlayerPrivate.cacheMap.set(`evict-${i}`, cache);
      }

      audioPlayerPrivate.evictCacheIfNeeded();

      expect(audioPlayerPrivate.cacheMap.size).toBe(maxSize);
      // Oldest entries should be removed
      expect(audioPlayerPrivate.cacheMap.has('evict-0')).toBe(false);
      // Newest entries should remain
      expect(audioPlayerPrivate.cacheMap.has(`evict-${maxSize + 4}`)).toBe(true);
    });
  });
});
