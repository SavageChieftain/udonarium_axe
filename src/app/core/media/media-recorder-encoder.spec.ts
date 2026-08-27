import {
  extensionOfMediaType,
  isMediaRecordingSupported,
  mediaRecordingType,
  recordVideo,
} from '@axe/core/media/media-recorder-encoder';
import type { VideoEncodeRequest } from '@axe/core/media/video-encoder';
import { BorrowedGlobals } from '@axe/testing/borrowed-globals';

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

describe('exporting through the media recorder', () => {
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

  const borrowed = new BorrowedGlobals();

  beforeEach(() => {
    captured = fakeStream();
    FakeMediaRecorder.supported = ['video/webm;codecs=vp9,opus'];
    borrowed.lend('MediaRecorder', FakeMediaRecorder);
    borrowed.lendOn(HTMLCanvasElement.prototype, 'captureStream', () => captured);
    borrowed.lendOn(HTMLCanvasElement.prototype, 'getContext', () => ({}));
  });

  afterEach(() => {
    borrowed.giveBack();
  });

  it('picks a container this browser can take', () => {
    expect(isMediaRecordingSupported()).toBe(true);
    expect(mediaRecordingType()).toBe('video/webm;codecs=vp9,opus');

    // MP4 comes first where it is accepted, since it can be handed round without converting.
    FakeMediaRecorder.supported = ['video/mp4', 'video/webm;codecs=vp9,opus'];
    expect(mediaRecordingType()).toBe('video/mp4');
  });

  it('exports nothing when it can take none of them', async () => {
    FakeMediaRecorder.supported = [];

    expect(mediaRecordingType()).toBeNull();
    expect(await recordVideo(request())).toBeNull();
  });

  it('returns the extension that matches the container', () => {
    expect(extensionOfMediaType('video/mp4;codecs=avc1.640028')).toBe('mp4');
    expect(extensionOfMediaType('video/webm;codecs=vp9,opus')).toBe('webm');
  });

  it('draws in real time into a single video', async () => {
    const painted: number[] = [];
    const result = await recordVideo(request({ paint: (_ctx, index) => void painted.push(index) }));

    // The frame number comes from the elapsed time, so it may skip under load but never goes back.
    expect(painted.length).toBeGreaterThan(0);
    expect([...painted].sort((left, right) => left - right)).toEqual(painted);
    expect(painted[0]).toBe(0);
    expect(result?.extension).toBe('webm');
    expect(result?.blob?.size).toBeGreaterThan(0);
  });

  it('returns nothing when stopped', async () => {
    expect(await recordVideo(request({ isCancelled: () => true }))).toBeNull();
  });

  it('reports its progress', async () => {
    const progress: number[] = [];
    await recordVideo(request({ onProgress: (done) => void progress.push(done) }));

    expect(progress.at(-1)).toBe(3);
  });
});
