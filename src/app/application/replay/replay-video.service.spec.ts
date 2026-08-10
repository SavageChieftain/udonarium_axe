import { TestBed } from '@angular/core/testing';
import { ReplayLibraryService } from '@axe/application/replay/replay-library.service';
import { DEFAULT_REPLAY_VIDEO_OPTIONS, ReplayVideoService } from '@axe/application/replay/replay-video.service';
import {
  type EncodedVideo,
  type VideoEncodeRequest,
  VideoEncoderGateway,
  type VideoPaintTarget,
} from '@axe/core/media/video-encoder';
import { ImageStorage } from '@axe/core/storage/image-storage';
import type { ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import { REPLAY_FRAME_PRESETS } from '@axe/domain/replay/replay-frame-layout';
import { encodeReplayKeyframe } from '@axe/domain/replay/replay-keyframe';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function say(seq: number, text: string, name = 'アリス'): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind: ReplayEventKind.ChatMessage,
    actorId: 'alice',
    detail: { text, name },
    visibility: PUBLIC_VISIBILITY,
  };
}

const meta: ReplayRecordingMeta = {
  id: 1,
  roomName: '第一夜',
  startedAt: new Date(2026, 0, 2, 20, 5).getTime(),
  endedAt: null,
  eventCount: 2,
  byteSize: 0,
};

describe('ReplayVideoService', () => {
  let service: ReplayVideoService;
  let encode: ReturnType<typeof vi.fn<(request: VideoEncodeRequest) => Promise<EncodedVideo | null>>>;
  let saved: { blob: Blob; name: string }[];
  let isSupported = true;

  beforeEach(() => {
    saved = [];
    isSupported = true;
    encode = vi.fn<(request: VideoEncodeRequest) => Promise<EncodedVideo | null>>(async (request) => {
      const ctx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
        measureText: (text: string) => ({ width: [...text].length * 20 }),
      } as unknown as VideoPaintTarget;

      for (let index = 0; index < Math.min(3, request.frameCount); index += 1) {
        if (request.isCancelled?.()) return null;
        await request.paint(ctx, index);
        request.onProgress?.(index + 1, request.frameCount);
      }
      return { blob: new Blob(['mp4'], { type: 'video/mp4' }), extension: 'mp4' };
    });

    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: VideoEncoderGateway,
          useValue: {
            get isSupported() {
              return isSupported;
            },
            encode: (request: VideoEncodeRequest) => encode(request),
            save: (blob: Blob, name: string) => saved.push({ blob, name }),
          },
        },
        {
          provide: ReplayLibraryService,
          useValue: {
            keyframeBefore: vi.fn().mockResolvedValue({
              seq: 0,
              blob: new Blob([
                encodeReplayKeyframe([
                  { identifier: 'c1', aliasName: 'character', syncData: { attributes: {} } },
                ]) as BlobPart,
              ]),
            }),
          },
        },
      ],
    });
    service = TestBed.inject(ReplayVideoService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('記録を MP4 として保存すること', async () => {
    expect(await service.render(meta, [say(1, 'やあ'), say(2, 'こんばんは')])).toBe(true);

    expect(saved).toHaveLength(1);
    expect(saved[0].name.endsWith('.mp4')).toBe(true);
    expect(saved[0].name.startsWith('第一夜_')).toBe(true);
  });

  it('選んだ大きさと滑らかさで頼むこと', async () => {
    await service.render(meta, [say(1, 'やあ')], {
      ...DEFAULT_REPLAY_VIDEO_OPTIONS,
      size: REPLAY_FRAME_PRESETS['720p'],
      fps: 24,
    });

    expect(encode.mock.calls[0][0]).toMatchObject({ width: 1280, height: 720, fps: 24 });
    expect(encode.mock.calls[0][0].frameCount).toBeGreaterThan(0);
  });

  it('尺のぶんだけコマ数を積むこと', async () => {
    await service.render(meta, [say(1, 'あ'.repeat(20))]);

    const request = encode.mock.calls[0][0];
    expect(request.frameCount).toBe(Math.round(((1200 + 20 * 55) / 1000) * 30));
  });

  it('進み具合を出すこと', async () => {
    let seen = 0;
    encode.mockImplementation(async (request) => {
      request.onProgress?.(5, 10);
      seen = service.progress();
      return { blob: new Blob(['mp4']), extension: 'mp4' };
    });

    await service.render(meta, [say(1, 'やあ')]);
    expect(seen).toBe(0.5);
    expect(service.isRendering()).toBe(false);
  });

  it('取りやめたら保存しないこと', async () => {
    encode.mockImplementation(async (request) => {
      service.cancel();
      return request.isCancelled?.() ? null : { blob: new Blob(['mp4']), extension: 'mp4' };
    });

    expect(await service.render(meta, [say(1, 'やあ')])).toBe(false);
    expect(saved).toHaveLength(0);
  });

  it('画にできる場面が無ければ書き出さないこと', async () => {
    const move: ReplayEvent = { ...say(1, ''), kind: ReplayEventKind.ObjectMove, detail: {} };
    expect(await service.render(meta, [move])).toBe(false);
    expect(encode).not.toHaveBeenCalled();
  });

  it('空の記録では何もしないこと', async () => {
    expect(await service.render(meta, [])).toBe(false);
  });

  it('書き出せない環境では断ること', async () => {
    isSupported = false;
    expect(service.isSupported).toBe(false);
    expect(await service.render(meta, [say(1, 'やあ')])).toBe(false);
  });

  it('二重に走らせないこと', async () => {
    let release: (() => void) | null = null;
    encode.mockImplementation(
      () =>
        new Promise<EncodedVideo | null>((resolve) => {
          release = () => resolve({ blob: new Blob(['mp4']), extension: 'mp4' });
        })
    );

    const first = service.render(meta, [say(1, 'やあ')]);
    expect(service.isRendering()).toBe(true);
    await vi.waitFor(() => expect(release).not.toBeNull());
    expect(await service.render(meta, [say(1, 'やあ')])).toBe(false);

    release!();
    await first;
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('素材が読めなくても書き出しを止めないこと', async () => {
    const image = { identifier: 'img-1', blob: new Blob(['x']) };
    vi.spyOn(TestBed.inject(ImageStorage), 'get').mockReturnValue(image as never);

    expect(await service.render(meta, [say(1, 'やあ')])).toBe(true);
  });
});
