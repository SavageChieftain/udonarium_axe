import { computed, inject, Injectable, signal } from '@angular/core';
import { ReplayLibraryService } from '@axe/application/replay/replay-library.service';
import { ReplaySoundMixer } from '@axe/application/replay/replay-sound-mixer';
import { Logger } from '@axe/core/logging/logger';
import { VideoEncoderGateway } from '@axe/core/media/video-encoder';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ImageStorage } from '@axe/core/storage/image-storage';
import type { ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { replayArchiveName } from '@axe/domain/replay/replay-archive';
import {
  buildReplayBoardScene,
  collectBoardAssetIds,
  type ReplayBoardScene,
} from '@axe/domain/replay/replay-board-view';
import { collectReplayCast } from '@axe/domain/replay/replay-cast';
import type { ReplayEvent, ReplayViewer } from '@axe/domain/replay/replay-event';
import { REPLAY_FRAME_PRESETS, replayFrameLayout, type ReplayFrameSize } from '@axe/domain/replay/replay-frame-layout';
import { decodeReplayKeyframe, type ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';
import { applyReplayEvents } from '@axe/domain/replay/replay-patch';
import { buildReplaySoundtrack, hasReplaySound } from '@axe/domain/replay/replay-soundtrack';
import {
  buildReplayStoryboard,
  type ReplayShot,
  type ReplayShotCaption,
  ReplayShotPacing as Pacing,
  type ReplayShotPacing,
  type ReplayShotScope,
  ReplayShotScope as Scope,
  type ReplayStoryboard,
  shotAt,
} from '@axe/domain/replay/replay-storyboard';
import {
  DEFAULT_REPLAY_FRAME_STYLE,
  paintReplayFrame,
  type ReplayFrameImage,
} from '@axe/infrastructure/replay/replay-frame-painter';

export const REPLAY_VIDEO_FPS = 30;
export const REPLAY_VIDEO_MAX_FRAMES = 30 * 60 * 60;

export interface ReplayVideoOptions {
  size: ReplayFrameSize;
  fps: number;
  pacing: ReplayShotPacing;
  scope: ReplayShotScope;
  withSound: boolean;
  caption?: ReplayShotCaption;
}

export const DEFAULT_REPLAY_VIDEO_OPTIONS: ReplayVideoOptions = {
  size: REPLAY_FRAME_PRESETS['1080p'],
  fps: REPLAY_VIDEO_FPS,
  pacing: Pacing.Reading,
  scope: Scope.Lines,
  withSound: true,
};

@Injectable({ providedIn: 'root' })
export class ReplayVideoService {
  private readonly library = inject(ReplayLibraryService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly audioStorage = inject(AudioStorage);
  private readonly mixer = inject(ReplaySoundMixer);
  private readonly encoder = inject(VideoEncoderGateway);

  private readonly _isRendering = signal(false);
  private readonly _done = signal(0);
  private readonly _total = signal(0);
  private cancelled = false;

  readonly isRendering = this._isRendering.asReadonly();
  readonly progress = computed(() => {
    const total = this._total();
    return total > 0 ? this._done() / total : 0;
  });

  get isSupported(): boolean {
    return this.encoder.isSupported;
  }

  cancel(): void {
    this.cancelled = true;
  }

  async render(
    meta: ReplayRecordingMeta,
    events: readonly ReplayEvent[],
    options: ReplayVideoOptions = DEFAULT_REPLAY_VIDEO_OPTIONS,
    viewer?: ReplayViewer
  ): Promise<boolean> {
    if (this._isRendering() || !this.isSupported || events.length < 1) return false;

    this._isRendering.set(true);
    this.cancelled = false;
    this._done.set(0);
    this._total.set(0);

    try {
      const base = await this.baseBoardOf(meta.id, events);
      const cast = collectReplayCast(base);
      const storyboard = buildReplayStoryboard(events, cast, { ...options, viewer });
      if (storyboard.shots.length < 1) {
        Logger.warn('[ReplayVideo] 画にできる場面がありませんでした', meta.id);
        return false;
      }

      const wanted = Math.max(1, Math.round((storyboard.totalMs / 1000) * options.fps));
      const frameCount = Math.min(REPLAY_VIDEO_MAX_FRAMES, wanted);
      if (frameCount < wanted) {
        Logger.warn('[ReplayVideo] 長すぎるため途中までにします', { wanted, frameCount });
      }
      this._total.set(frameCount);

      const layout = replayFrameLayout(options.size);
      const boards = this.boardsFor(storyboard.shots, events, base);
      const boardOfSeq = new Map(storyboard.shots.map((shot, index) => [shot.seq, boards[index]]));
      const assets = await this.loadAssets([
        ...storyboard.shots.flatMap((shot) => [shot.portraitId, shot.backgroundId]),
        ...boards.flatMap((board) => collectBoardAssetIds(board)),
      ]);
      const msPerFrame = 1000 / options.fps;
      const audio = options.withSound ? await this.soundOf(events, storyboard) : null;

      try {
        const encoded = await this.encoder.encode({
          width: options.size.width,
          height: options.size.height,
          fps: options.fps,
          frameCount,
          audio,
          isCancelled: () => this.cancelled,
          onProgress: (done, total) => {
            this._done.set(done);
            this._total.set(total);
          },
          paint: (ctx, index) => {
            const shot = shotAt(storyboard, index * msPerFrame);
            paintReplayFrame(
              ctx,
              layout,
              shot,
              { imageOf: (identifier) => assets.get(identifier) ?? null },
              frameCount > 1 ? index / (frameCount - 1) : 1,
              DEFAULT_REPLAY_FRAME_STYLE,
              shot ? (boardOfSeq.get(shot.seq) ?? null) : null
            );
          },
        });
        if (!encoded) return false;

        this.encoder.save(
          encoded.blob,
          `${replayArchiveName({ roomName: meta.roomName, startedAt: meta.startedAt })}.${encoded.extension}`
        );
        return true;
      } finally {
        for (const bitmap of assets.values()) bitmap.close?.();
      }
    } catch (reason) {
      Logger.warn('[ReplayVideo] 動画にできませんでした', reason);
      return false;
    } finally {
      this._isRendering.set(false);
    }
  }

  private async soundOf(events: readonly ReplayEvent[], storyboard: ReplayStoryboard) {
    try {
      const soundtrack = buildReplaySoundtrack(events, storyboard);
      if (!hasReplaySound(soundtrack)) return null;
      return await this.mixer.mix(soundtrack, async (identifier) => {
        const audio = this.audioStorage.get(identifier);
        if (!audio) {
          Logger.warn('[ReplayVideo] この音はこのブラウザに残っていません', identifier);
          return null;
        }
        if (audio.blob) return await audio.blob.arrayBuffer();
        if (audio.url.length > 0) return await (await fetch(audio.url)).arrayBuffer();
        Logger.warn('[ReplayVideo] 音の中身がありません', identifier);
        return null;
      });
    } catch (reason) {
      Logger.warn('[ReplayVideo] 音を作れませんでした', reason);
      return null;
    }
  }

  private async baseBoardOf(id: number, events: readonly ReplayEvent[]): Promise<ReplayObjectSnapshot[]> {
    try {
      const keyframe = await this.library.keyframeBefore(id, events[0]?.seq ?? 0);
      if (!keyframe) return [];
      return decodeReplayKeyframe(new Uint8Array(await keyframe.blob.arrayBuffer()));
    } catch (reason) {
      Logger.warn('[ReplayVideo] 卓の様子を読めませんでした', reason);
      return [];
    }
  }

  private boardsFor(
    shots: readonly ReplayShot[],
    events: readonly ReplayEvent[],
    base: readonly ReplayObjectSnapshot[]
  ): (ReplayBoardScene | null)[] {
    if (base.length < 1) return shots.map(() => null);

    const indexOfSeq = new Map(events.map((event, index) => [event.seq, index]));
    let board: readonly ReplayObjectSnapshot[] = base;
    let from = 0;

    return shots.map((shot) => {
      const upto = indexOfSeq.get(shot.seq);
      if (upto !== undefined && upto >= from) {
        board = applyReplayEvents(board, events.slice(from, upto + 1));
        from = upto + 1;
      }
      return buildReplayBoardScene(board);
    });
  }

  private async loadAssets(
    identifiers: readonly string[]
  ): Promise<Map<string, ReplayFrameImage & { close?(): void }>> {
    const wanted = new Set(identifiers.filter((identifier) => identifier.length > 0));
    const assets = new Map<string, ReplayFrameImage & { close?(): void }>();

    for (const identifier of wanted) {
      const image = this.imageStorage.get(identifier);
      if (!image) {
        Logger.warn('[ReplayVideo] この絵はこのブラウザに残っていません', identifier);
        continue;
      }
      try {
        const drawable = await toDrawableImage(image.blob, image.url);
        if (drawable) assets.set(identifier, drawable);
        else Logger.warn('[ReplayVideo] 絵の中身がありません', identifier);
      } catch (reason) {
        Logger.warn('[ReplayVideo] 絵を読めませんでした', identifier, reason);
      }
    }
    return assets;
  }
}

async function toDrawableImage(
  blob: Blob | null,
  url: string
): Promise<(ReplayFrameImage & { close?(): void }) | null> {
  if (blob && typeof createImageBitmap === 'function') {
    return (await createImageBitmap(blob)) as ReplayFrameImage & { close(): void };
  }
  if (url.length < 1) return null;
  return await new Promise((resolve, reject) => {
    const element = new Image();
    element.crossOrigin = 'anonymous';
    element.onload = () => resolve(element as unknown as ReplayFrameImage);
    element.onerror = () => reject(new Error(`読めない絵です: ${url}`));
    element.src = url;
  });
}
