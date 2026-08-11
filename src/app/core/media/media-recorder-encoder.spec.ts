import {
  extensionOfMediaType,
  isMediaRecordingSupported,
  mediaRecordingType,
  recordVideo,
} from '@axe/core/media/media-recorder-encoder';
import type { VideoEncodeRequest } from '@axe/core/media/video-encoder';

class FakeMediaRecorder {
  static supported: string[] = [];
  static isTypeSupported(type: string): boolean {
    return FakeMediaRecorder.supported.includes(type);
  }

  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state = 'inactive';

  constructor(
    readonly stream: MediaStream,
    readonly options: { mimeType: string }
  ) {}

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['frame'], { type: this.options.mimeType }) });
    this.onstop?.();
  }
}

function fakeStream(): MediaStream {
  const tracks: MediaStreamTrack[] = [];
  return {
    addTrack: (track: MediaStreamTrack) => tracks.push(track),
    getTracks: () => tracks,
    getAudioTracks: () => [],
  } as unknown as MediaStream;
}

describe('MediaRecorder による書き出し', () => {
  const globals = globalThis as Record<string, unknown>;
  let captured: MediaStream;

  function request(overrides: Partial<VideoEncodeRequest> = {}): VideoEncodeRequest {
    return {
      width: 16,
      height: 16,
      fps: 60,
      frameCount: 3,
      paint: () => undefined,
      ...overrides,
    };
  }

  beforeEach(() => {
    captured = fakeStream();
    FakeMediaRecorder.supported = ['video/webm;codecs=vp9,opus'];
    globals['MediaRecorder'] = FakeMediaRecorder;
    (HTMLCanvasElement.prototype as unknown as { captureStream: () => MediaStream }).captureStream = () => captured;
    HTMLCanvasElement.prototype.getContext = (() => ({}) as unknown) as HTMLCanvasElement['getContext'];
  });

  afterEach(() => {
    delete globals['MediaRecorder'];
  });

  it('この環境が受け取れる入れ物を選ぶこと', () => {
    expect(isMediaRecordingSupported()).toBe(true);
    expect(mediaRecordingType()).toBe('video/webm;codecs=vp9,opus');

    // MP4 を受け取れるなら、そちらを先に採る。追加の変換なしで配れる。
    FakeMediaRecorder.supported = ['video/mp4', 'video/webm;codecs=vp9,opus'];
    expect(mediaRecordingType()).toBe('video/mp4');
  });

  it('どれも受け取れないなら書き出さないこと', async () => {
    FakeMediaRecorder.supported = [];

    expect(mediaRecordingType()).toBeNull();
    expect(await recordVideo(request())).toBeNull();
  });

  it('入れ物に合った拡張子を返すこと', () => {
    expect(extensionOfMediaType('video/mp4;codecs=avc1.640028')).toBe('mp4');
    expect(extensionOfMediaType('video/webm;codecs=vp9,opus')).toBe('webm');
  });

  it('実時間で描いて 1 本の動画にすること', async () => {
    const painted: number[] = [];
    const result = await recordVideo(request({ paint: (_ctx, index) => void painted.push(index) }));

    // コマ番号は経過時間から決まるので、詰まって飛ぶことはあっても戻らない。
    expect(painted.length).toBeGreaterThan(0);
    expect([...painted].sort((left, right) => left - right)).toEqual(painted);
    expect(painted[0]).toBe(0);
    expect(result?.extension).toBe('webm');
    expect(result?.blob?.size).toBeGreaterThan(0);
  });

  it('やめたら何も返さないこと', async () => {
    expect(await recordVideo(request({ isCancelled: () => true }))).toBeNull();
  });

  it('進み具合を知らせること', async () => {
    const progress: number[] = [];
    await recordVideo(request({ onProgress: (done) => void progress.push(done) }));

    expect(progress.at(-1)).toBe(3);
  });
});
