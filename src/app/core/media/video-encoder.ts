import { Logger } from '@axe/core/logging/logger';
import { isMediaRecordingSupported, recordVideo } from '@axe/core/media/media-recorder-encoder';
import { downloadBlob } from '@axe/core/util/download-blob';

export type VideoPaintTarget = OffscreenCanvasRenderingContext2D;

export interface EncodedAudio {
  sampleRate: number;
  channels: readonly Float32Array[];
}

export interface VideoEncodeRequest {
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  bitrate?: number;
  audio?: EncodedAudio | null;
  /** 書き出し先。渡すとメモリを経由せず直接そこへ流す。 */
  file?: FileSystemFileHandle | null;
  paint(ctx: VideoPaintTarget, frameIndex: number): void | Promise<void>;
  onProgress?(done: number, total: number): void;
  isCancelled?(): boolean;
}

export interface EncodedVideo {
  /** 書き出し先を渡したときは null。すでにそのファイルへ書き終えている。 */
  blob: Blob | null;
  extension: string;
}

export const VIDEO_KEYFRAME_INTERVAL = 60;
/**
 * ここを超える見込みなら、先頭に索引を置く形（`in-memory`）をやめて逐次書きに切り替える。
 * 索引を先頭に置くには全体をいったんメモリに持つ必要があり、そこが長さの上限になる。
 */
export const VIDEO_INLINE_INDEX_BUDGET_BYTES = 512 * 1024 * 1024;
export const VIDEO_ENCODE_QUEUE_LIMIT = 8;
export const AUDIO_FRAME_SAMPLES = 1024;
export const AUDIO_BITRATE = 128_000;

export function isVideoEncodingSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
  );
}

export function isAudioEncodingSupported(): boolean {
  return typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined';
}

/** AAC / Opus のうち、この環境が符号化できるほう。どちらも駄目なら null。 */
export async function audioCodecFor(sound: EncodedAudio): Promise<{ codec: 'aac' | 'opus'; webCodec: string } | null> {
  if (!isAudioEncodingSupported()) return null;
  // 問い合わせ口が無いなら試しようがないので、従来どおり AAC で当たる。
  if (typeof AudioEncoder.isConfigSupported !== 'function') return { codec: 'aac', webCodec: 'mp4a.40.2' };

  const candidates = [
    { codec: 'aac', webCodec: 'mp4a.40.2' },
    { codec: 'opus', webCodec: 'opus' },
  ] as const;
  for (const candidate of candidates) {
    try {
      const support = await AudioEncoder.isConfigSupported({
        codec: candidate.webCodec,
        numberOfChannels: sound.channels.length,
        sampleRate: sound.sampleRate,
        bitrate: AUDIO_BITRATE,
      });
      if (support.supported) return { ...candidate };
    } catch {
      continue;
    }
  }
  return null;
}

export function defaultVideoBitrate(width: number, height: number, fps: number): number {
  return Math.round(width * height * fps * 0.09);
}

export function avcCodecFor(width: number, height: number): string {
  const pixels = width * height;
  if (pixels > 1920 * 1080) return 'avc1.640033';
  if (pixels > 1280 * 720) return 'avc1.640028';
  return 'avc1.64001f';
}

export class VideoEncoderGateway {
  private static _instance: VideoEncoderGateway;
  static get instance(): VideoEncoderGateway {
    if (!VideoEncoderGateway._instance) VideoEncoderGateway._instance = new VideoEncoderGateway();
    return VideoEncoderGateway._instance;
  }

  get isSupported(): boolean {
    return isVideoEncodingSupported() || isMediaRecordingSupported();
  }

  /** WebCodecs が無いブラウザでは、実時間で録る道へ落とす。 */
  get isRealtimeOnly(): boolean {
    return !isVideoEncodingSupported() && isMediaRecordingSupported();
  }

  encode(request: VideoEncodeRequest): Promise<EncodedVideo | null> {
    return isVideoEncodingSupported() ? encodeVideo(request) : recordVideo(request);
  }

  save(blob: Blob | null, fileName: string): void {
    // 書き出し先を指定していたときは、すでにそこへ書き終えている。
    if (blob) downloadBlob(blob, fileName);
  }
}

export async function encodeVideo(request: VideoEncodeRequest): Promise<EncodedVideo | null> {
  if (!isVideoEncodingSupported()) {
    Logger.warn('[VideoEncoder] この環境では動画を書き出せません');
    return null;
  }

  const ctx = new OffscreenCanvas(request.width, request.height).getContext('2d');
  if (!ctx) return null;

  const { ArrayBufferTarget, FileSystemWritableFileStreamTarget, Muxer, StreamTarget } = await import('mp4-muxer');
  const sound = request.audio && request.audio.channels.length > 0 ? request.audio : null;
  const soundCodec = sound ? await audioCodecFor(sound) : null;
  const bitrate = request.bitrate ?? defaultVideoBitrate(request.width, request.height, request.fps);

  // 長い動画は索引を先頭に置けない（全体をメモリに持つことになる）ので、
  // 逐次書き出せる形に切り替える。書き出し先が指定されていればディスクへ直接流す。
  const estimatedBytes = ((bitrate + AUDIO_BITRATE) / 8) * (request.frameCount / request.fps);
  const streaming = request.file != null || estimatedBytes > VIDEO_INLINE_INDEX_BUDGET_BYTES;

  const writable = request.file ? await request.file.createWritable() : null;
  const parts: BlobPart[] = [];
  const target = writable
    ? new FileSystemWritableFileStreamTarget(writable)
    : streaming
      ? new StreamTarget({ onData: (data) => parts.push(data.slice()), chunked: true })
      : new ArrayBufferTarget();

  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: request.width, height: request.height, frameRate: request.fps },
    audio:
      sound && soundCodec
        ? { codec: soundCodec.codec, numberOfChannels: sound.channels.length, sampleRate: sound.sampleRate }
        : undefined,
    fastStart: streaming ? 'fragmented' : 'in-memory',
  });

  let failure: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (reason) => {
      failure = reason;
    },
  });

  const microsPerFrame = 1_000_000 / request.fps;
  try {
    encoder.configure({
      codec: avcCodecFor(request.width, request.height),
      width: request.width,
      height: request.height,
      framerate: request.fps,
      bitrate,
    });

    for (let index = 0; index < request.frameCount; index += 1) {
      if (request.isCancelled?.()) return null;
      if (failure) throw failure;

      await request.paint(ctx, index);
      const frame = new VideoFrame(ctx.canvas, {
        timestamp: Math.round(index * microsPerFrame),
        duration: Math.round(microsPerFrame),
      });
      encoder.encode(frame, { keyFrame: index % VIDEO_KEYFRAME_INTERVAL === 0 });
      frame.close();

      if (encoder.encodeQueueSize > VIDEO_ENCODE_QUEUE_LIMIT) await drain(encoder);
      request.onProgress?.(index + 1, request.frameCount);
    }

    await encoder.flush();
    if (failure) throw failure;
    if (sound && soundCodec) await encodeSound(muxer, sound, soundCodec.webCodec);
    muxer.finalize();
    if (writable) {
      await writable.close();
      return { blob: null, extension: 'mp4' };
    }
    const body: BlobPart[] = target instanceof ArrayBufferTarget ? [target.buffer as BlobPart] : parts;
    return { blob: new Blob(body, { type: 'video/mp4' }), extension: 'mp4' };
  } catch (reason) {
    Logger.warn('[VideoEncoder] 書き出しに失敗しました', reason);
    if (writable) await writable.abort().catch(() => undefined);
    return null;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
}

async function drain(encoder: VideoEncoder): Promise<void> {
  while (encoder.encodeQueueSize > VIDEO_ENCODE_QUEUE_LIMIT / 2) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function encodeSound(
  muxer: { addAudioChunk(chunk: EncodedAudioChunk, meta?: unknown): void },
  sound: EncodedAudio,
  webCodec: string
) {
  let failure: unknown = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (reason) => {
      failure = reason;
    },
  });

  encoder.configure({
    codec: webCodec,
    numberOfChannels: sound.channels.length,
    sampleRate: sound.sampleRate,
    bitrate: AUDIO_BITRATE,
  });

  const total = sound.channels[0].length;
  const interleaved = new Float32Array(AUDIO_FRAME_SAMPLES * sound.channels.length);
  try {
    for (let offset = 0; offset < total; offset += AUDIO_FRAME_SAMPLES) {
      if (failure) throw failure;
      const count = Math.min(AUDIO_FRAME_SAMPLES, total - offset);
      for (const [channel, samples] of sound.channels.entries()) {
        interleaved.set(samples.subarray(offset, offset + count), channel * count);
      }

      const data = new AudioData({
        format: 'f32-planar',
        sampleRate: sound.sampleRate,
        numberOfFrames: count,
        numberOfChannels: sound.channels.length,
        timestamp: Math.round((offset / sound.sampleRate) * 1_000_000),
        data: interleaved.subarray(0, count * sound.channels.length),
      });
      encoder.encode(data);
      data.close();
      if (encoder.encodeQueueSize > VIDEO_ENCODE_QUEUE_LIMIT) await drainAudio(encoder);
    }
    await encoder.flush();
    if (failure) throw failure;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
}

async function drainAudio(encoder: AudioEncoder): Promise<void> {
  while (encoder.encodeQueueSize > VIDEO_ENCODE_QUEUE_LIMIT / 2) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
