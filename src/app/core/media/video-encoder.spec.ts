import {
  avcCodecFor,
  defaultVideoBitrate,
  encodeVideo,
  isVideoEncodingSupported,
  VIDEO_KEYFRAME_INTERVAL,
} from '@axe/core/media/video-encoder';

interface FakeEncoderCall {
  timestamp: number;
  keyFrame: boolean;
}

const globals = globalThis as unknown as Record<string, unknown>;

class FakeOffscreenCanvas {
  constructor(
    readonly width: number,
    readonly height: number
  ) {}
  getContext(): { canvas: FakeOffscreenCanvas } | null {
    return hasContext ? { canvas: this } : null;
  }
}

let hasContext = true;
let calls: FakeEncoderCall[];
let configured: Record<string, unknown> | null;
let closed = false;
let flushed = false;
let failOn: number | null = null;

class FakeEncodedVideoChunk {
  readonly type: string;
  readonly timestamp: number;
  readonly duration: number;
  readonly byteLength: number;
  private readonly payload = new Uint8Array([0, 0, 0, 1, 0x65]);

  constructor(init: { type: string; timestamp: number; duration: number }) {
    this.type = init.type;
    this.timestamp = init.timestamp;
    this.duration = init.duration;
    this.byteLength = this.payload.byteLength;
  }
  copyTo(destination: Uint8Array): void {
    destination.set(this.payload);
  }
}

class FakeVideoFrame {
  readonly timestamp: number;
  constructor(_source: unknown, init: { timestamp: number }) {
    this.timestamp = init.timestamp;
  }
  close(): void {}
}

class FakeVideoEncoder {
  state = 'unconfigured';
  encodeQueueSize = 0;
  private readonly error: (reason: unknown) => void;
  private readonly output: (chunk: unknown, meta: unknown) => void;

  constructor(init: { output: (chunk: unknown, meta: unknown) => void; error: (reason: unknown) => void }) {
    this.error = init.error;
    this.output = init.output;
  }
  configure(config: Record<string, unknown>): void {
    configured = config;
    this.state = 'configured';
  }
  encode(frame: FakeVideoFrame, options: { keyFrame: boolean }): void {
    if (failOn !== null && calls.length === failOn) this.error(new Error('encoder gave up'));
    calls.push({ timestamp: frame.timestamp, keyFrame: options.keyFrame });

    this.output(
      new FakeEncodedVideoChunk({
        type: options.keyFrame ? 'key' : 'delta',
        timestamp: frame.timestamp,
        duration: 33333,
      }),
      calls.length === 1
        ? { decoderConfig: { codec: 'avc1.64001f', description: new Uint8Array([1, 100, 0, 31, 255, 225, 0, 0, 0]) } }
        : undefined
    );
  }
  async flush(): Promise<void> {
    flushed = true;
  }
  close(): void {
    closed = true;
    this.state = 'closed';
  }
}

describe('video encoding', () => {
  beforeEach(() => {
    calls = [];
    configured = null;
    closed = false;
    flushed = false;
    failOn = null;
    hasContext = true;
    globals['OffscreenCanvas'] = FakeOffscreenCanvas;
    globals['VideoEncoder'] = FakeVideoEncoder;
    globals['VideoFrame'] = FakeVideoFrame;
    globals['EncodedVideoChunk'] = FakeEncodedVideoChunk;
  });

  afterEach(() => {
    delete globals['OffscreenCanvas'];
    delete globals['VideoEncoder'];
    delete globals['VideoFrame'];
    delete globals['EncodedVideoChunk'];
  });

  function request(overrides: Record<string, unknown> = {}) {
    return {
      width: 1280,
      height: 720,
      fps: 30,
      frameCount: 3,
      paint: vi.fn(),
      ...overrides,
    };
  }

  it('環境が揃っているかを見ること', () => {
    expect(isVideoEncodingSupported()).toBe(true);

    delete globals['VideoEncoder'];
    expect(isVideoEncodingSupported()).toBe(false);
  });

  it('書き出せない環境では何も返さないこと', async () => {
    delete globals['VideoFrame'];
    expect(await encodeVideo(request())).toBeNull();
  });

  it('1 コマずつ描いて MP4 にすること', async () => {
    const paint = vi.fn();
    const result = await encodeVideo(request({ paint }));

    expect(paint).toHaveBeenCalledTimes(3);
    expect(paint.mock.calls.map((call) => call[1])).toEqual([0, 1, 2]);
    expect(calls.map((call) => call.timestamp)).toEqual([0, 33333, 66667]);
    expect(flushed).toBe(true);
    expect(result?.extension).toBe('mp4');
    expect(result?.blob.type).toBe('video/mp4');
  });

  it('先頭とときどきをキーフレームにすること', async () => {
    await encodeVideo(request({ frameCount: VIDEO_KEYFRAME_INTERVAL + 2 }));

    expect(calls[0].keyFrame).toBe(true);
    expect(calls[1].keyFrame).toBe(false);
    expect(calls[VIDEO_KEYFRAME_INTERVAL].keyFrame).toBe(true);
  });

  it('進み具合を知らせること', async () => {
    const onProgress = vi.fn();
    await encodeVideo(request({ onProgress }));

    expect(onProgress.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('取りやめたらそこで止めること', async () => {
    const paint = vi.fn();
    const result = await encodeVideo(request({ paint, frameCount: 10, isCancelled: () => calls.length >= 2 }));

    expect(result).toBeNull();
    expect(paint).toHaveBeenCalledTimes(2);
    expect(closed).toBe(true);
  });

  it('途中で符号化が転んでも投げずに終えること', async () => {
    failOn = 1;
    expect(await encodeVideo(request({ frameCount: 5 }))).toBeNull();
    expect(closed).toBe(true);
  });

  it('描き場所を作れなければ諦めること', async () => {
    hasContext = false;
    expect(await encodeVideo(request())).toBeNull();
  });

  it('大きさに見合う符号と帯域を選ぶこと', async () => {
    await encodeVideo(request({ width: 1920, height: 1080 }));
    expect(configured?.['codec']).toBe(avcCodecFor(1920, 1080));
    expect(configured?.['bitrate']).toBe(defaultVideoBitrate(1920, 1080, 30));

    expect(avcCodecFor(1280, 720)).toBe('avc1.64001f');
    expect(avcCodecFor(1920, 1080)).toBe('avc1.640028');
    expect(avcCodecFor(3840, 2160)).toBe('avc1.640033');
  });

  it('帯域を指定したらそれを使うこと', async () => {
    await encodeVideo(request({ bitrate: 123_456 }));
    expect(configured?.['bitrate']).toBe(123_456);
  });
});
