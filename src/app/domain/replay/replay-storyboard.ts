import type { ReplayCastMember } from '@axe/domain/replay/replay-cast';
import {
  canViewReplayEvent,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayViewer,
} from '@axe/domain/replay/replay-event';

export const ReplayShotPacing = {
  Reading: 'reading',
  Recorded: 'recorded',
} as const;

export type ReplayShotPacing = (typeof ReplayShotPacing)[keyof typeof ReplayShotPacing];

export const ReplayShotScope = {
  Lines: 'lines',
  Everything: 'everything',
} as const;

export type ReplayShotScope = (typeof ReplayShotScope)[keyof typeof ReplayShotScope];

export const REPLAY_SHOT_MIN_MS = 1_200;
export const REPLAY_SHOT_MAX_MS = 8_000;
export const REPLAY_SHOT_PER_CHAR_MS = 55;
export const REPLAY_CHAPTER_HOLD_MS = 2_400;

export interface ReplayStoryboardOptions {
  pacing: ReplayShotPacing;
  scope: ReplayShotScope;
  viewer?: ReplayViewer;
}

export const DEFAULT_REPLAY_STORYBOARD_OPTIONS: ReplayStoryboardOptions = {
  pacing: ReplayShotPacing.Reading,
  scope: ReplayShotScope.Lines,
};

export interface ReplayShot {
  seq: number;
  startMs: number;
  durationMs: number;
  kind: ReplayEventKind;
  chapter: string;
  isChapterStart: boolean;
  speaker: string;
  speakerColor: string;
  portraitId: string;
  backgroundId: string;
  text: string;
  isNarration: boolean;
}

export interface ReplayStoryboard {
  shots: readonly ReplayShot[];
  totalMs: number;
}

export const EMPTY_REPLAY_STORYBOARD: ReplayStoryboard = { shots: [], totalMs: 0 };

const SPOKEN_KINDS: ReadonlySet<ReplayEventKind> = new Set([ReplayEventKind.ChatMessage, ReplayEventKind.ChatDice]);

const NARRATED_KINDS: ReadonlySet<ReplayEventKind> = new Set([
  ReplayEventKind.Marker,
  ReplayEventKind.TableChange,
  ReplayEventKind.TurnChange,
  ReplayEventKind.VoteFinish,
  ReplayEventKind.MediaCutIn,
  ReplayEventKind.EffectCast,
]);

export function buildReplayStoryboard(
  events: readonly ReplayEvent[],
  cast: readonly ReplayCastMember[],
  options: ReplayStoryboardOptions = DEFAULT_REPLAY_STORYBOARD_OPTIONS
): ReplayStoryboard {
  const portraits = portraitsByName(cast);
  const shots: ReplayShot[] = [];

  let chapter = '';
  let background = '';
  let startMs = 0;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (options.viewer && !canViewReplayEvent(event, options.viewer)) continue;

    if (event.kind === ReplayEventKind.VnScene) {
      background = event.targetId ?? '';
      continue;
    }

    const isChapter = event.kind === ReplayEventKind.Marker;
    if (isChapter) chapter = String(event.detail['label'] ?? '').trim();

    if (!isShown(event.kind, options.scope)) continue;

    const text = textOfShot(event);
    if (text.length < 1 && !isChapter) continue;

    const speaker = isChapter ? '' : String(event.detail['name'] ?? '').trim();
    const durationMs = durationOf(event, events[index + 1], text, isChapter, options.pacing);

    shots.push({
      seq: event.seq,
      startMs,
      durationMs,
      kind: event.kind,
      chapter,
      isChapterStart: isChapter,
      speaker,
      speakerColor: String(event.detail['messColor'] ?? '').trim(),
      portraitId: portraitOf(event, speaker, portraits),
      backgroundId: background,
      text,
      isNarration: isChapter || speaker.length < 1,
    });
    startMs += durationMs;
  }

  return { shots, totalMs: startMs };
}

export function shotAt(storyboard: ReplayStoryboard, atMs: number): ReplayShot | null {
  const { shots } = storyboard;
  if (shots.length < 1) return null;
  if (atMs < 0) return shots[0];

  let low = 0;
  let high = shots.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (shots[middle].startMs <= atMs) low = middle;
    else high = middle - 1;
  }
  const shot = shots[low];
  return atMs < shot.startMs + shot.durationMs ? shot : null;
}

function isShown(kind: ReplayEventKind, scope: ReplayShotScope): boolean {
  if (SPOKEN_KINDS.has(kind) || kind === ReplayEventKind.Marker) return true;
  return scope === ReplayShotScope.Everything && NARRATED_KINDS.has(kind);
}

function textOfShot(event: ReplayEvent): string {
  if (event.kind === ReplayEventKind.Marker) return String(event.detail['label'] ?? '').trim();
  return String(event.detail['text'] ?? '').trim();
}

function durationOf(
  event: ReplayEvent,
  next: ReplayEvent | undefined,
  text: string,
  isChapter: boolean,
  pacing: ReplayShotPacing
): number {
  if (pacing === ReplayShotPacing.Recorded && next) {
    const gap = Math.round(next.t - event.t);
    if (gap > 0) return Math.min(REPLAY_SHOT_MAX_MS, Math.max(REPLAY_SHOT_MIN_MS, gap));
  }
  if (isChapter) return REPLAY_CHAPTER_HOLD_MS;
  return Math.min(REPLAY_SHOT_MAX_MS, REPLAY_SHOT_MIN_MS + text.length * REPLAY_SHOT_PER_CHAR_MS);
}

function portraitsByName(cast: readonly ReplayCastMember[]): Map<string, ReplayCastMember> {
  const byName = new Map<string, ReplayCastMember>();
  for (const member of cast) {
    const name = member.name.trim();
    if (name.length > 0 && !byName.has(name)) byName.set(name, member);
  }
  return byName;
}

function portraitOf(event: ReplayEvent, speaker: string, portraits: Map<string, ReplayCastMember>): string {
  const own = String(event.detail['imageIdentifier'] ?? '').trim();
  if (own.length > 0) return own;
  return portraits.get(speaker)?.imageIdentifier ?? '';
}
