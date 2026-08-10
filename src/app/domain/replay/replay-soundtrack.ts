import { type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import type { ReplayStoryboard } from '@axe/domain/replay/replay-storyboard';

export const REPLAY_SE_GAIN = 0.9;
export const REPLAY_BGM_GAIN = 0.45;
export const REPLAY_BGM_FADE_MS = 600;

export interface ReplaySoundCue {
  audioIdentifier: string;
  startMs: number;
  offsetMs: number;
  gain: number;
}

export interface ReplayBgmCue extends ReplaySoundCue {
  endMs: number;
  fadeMs: number;
}

export interface ReplaySoundtrack {
  effects: readonly ReplaySoundCue[];
  music: readonly ReplayBgmCue[];
  totalMs: number;
}

export const EMPTY_REPLAY_SOUNDTRACK: ReplaySoundtrack = { effects: [], music: [], totalMs: 0 };

export function buildReplaySoundtrack(events: readonly ReplayEvent[], storyboard: ReplayStoryboard): ReplaySoundtrack {
  if (storyboard.totalMs < 1) return EMPTY_REPLAY_SOUNDTRACK;

  const effects: ReplaySoundCue[] = [];
  const music: ReplayBgmCue[] = [];
  let playing: ReplayBgmCue | null = null;

  for (const event of events) {
    const startMs = storyboard.timeOfSeq.get(event.seq);
    if (startMs === undefined || startMs >= storyboard.totalMs) continue;

    if (event.kind === ReplayEventKind.MediaSoundEffect) {
      const audioIdentifier = String(event.detail['identifier'] ?? '').trim();
      if (audioIdentifier.length > 0) {
        effects.push({ audioIdentifier, startMs, offsetMs: 0, gain: REPLAY_SE_GAIN });
      }
      continue;
    }

    if (event.kind !== ReplayEventKind.MediaBgm) continue;

    if (playing) {
      playing.endMs = startMs;
      if (playing.endMs > playing.startMs) music.push(playing);
      playing = null;
    }

    const audioIdentifier = (event.targetId ?? '').trim();
    if (audioIdentifier.length < 1 || event.detail['isPlaying'] !== true) continue;

    playing = {
      audioIdentifier,
      startMs,
      offsetMs: Math.max(0, Math.round(Number(event.detail['startTime'] ?? 0) * 1000)),
      gain: REPLAY_BGM_GAIN,
      endMs: storyboard.totalMs,
      fadeMs: REPLAY_BGM_FADE_MS,
    };
  }

  if (playing && playing.endMs > playing.startMs) music.push(playing);

  return { effects, music, totalMs: storyboard.totalMs };
}

export function collectSoundtrackAssetIds(soundtrack: ReplaySoundtrack): string[] {
  return [...soundtrack.effects, ...soundtrack.music].map((cue) => cue.audioIdentifier);
}

export function hasReplaySound(soundtrack: ReplaySoundtrack): boolean {
  return soundtrack.effects.length > 0 || soundtrack.music.length > 0;
}
