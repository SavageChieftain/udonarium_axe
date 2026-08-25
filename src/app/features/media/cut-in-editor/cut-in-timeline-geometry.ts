/**
 * Where a moment falls along the timeline, and what the pointer lands on.
 *
 * Measurements come in as numbers and answers go out as numbers, so none of this needs
 * a browser to be checked.
 */

export interface TimelineTick {
  ms: number;
  /** Whether the tick carries a reading, rather than being one of the small ones between. */
  major: boolean;
}

/** How near a key has to be to count as the one grabbed, and what the clock is rounded to. */
export const KEY_GRAB_PX = 6;

/**
 * How tall each band of the timeline stands.
 *
 * The layer heads sit beside the bands rather than off in a column of their own, so that a
 * row of keyframes can be read off against the name of the layer it belongs to. Both are
 * measured from here, which is what keeps them level with one another.
 */
export const TIMELINE_RULER_H_PX = 20;
export const TIMELINE_SOUND_H_PX = 20;
export const TIMELINE_ROW_H_PX = 24;
/** How far down the first layer band begins: the ruler and the sound row above it. */
export const TIMELINE_HEAD_OFFSET_PX = TIMELINE_RULER_H_PX + TIMELINE_SOUND_H_PX;
export const SNAP_MS = 10;

/** The scale that fits the whole scene into the room the track has. */
export function pxPerSecFor(durationMs: number, width: number): number {
  if (durationMs < 1 || width < 1) return 100;
  return (width * 1000) / durationMs;
}

export function msToX(ms: number, pxPerSec: number): number {
  return (ms * pxPerSec) / 1000;
}

export function xToMs(x: number, pxPerSec: number): number {
  if (pxPerSec <= 0) return 0;
  return (x * 1000) / pxPerSec;
}

/** A moment rounded to the grid and held inside the scene. */
export function snapMs(ms: number, durationMs: number, gridMs = SNAP_MS): number {
  const grid = gridMs > 0 ? gridMs : 1;
  const snapped = Math.round(ms / grid) * grid;
  return Math.min(durationMs, Math.max(0, snapped));
}

/** Where a layer's time on screen falls along the track. */
export function barRect(
  layer: { startMs: number; endMs: number },
  durationMs: number,
  pxPerSec: number
): { left: number; width: number } {
  const startMs = Math.min(Math.max(0, layer.startMs), durationMs);
  const endMs = layer.endMs > 0 ? Math.min(Math.max(startMs, layer.endMs), durationMs) : durationMs;
  return { left: msToX(startMs, pxPerSec), width: Math.max(1, msToX(endMs - startMs, pxPerSec)) };
}

/**
 * The readings along the ruler.
 *
 * The step is chosen so the readings stay far enough apart to read, whatever the scene's
 * length, and every fifth one is a major.
 */
export function visibleTicks(durationMs: number, pxPerSec: number): TimelineTick[] {
  if (durationMs < 1 || pxPerSec <= 0) return [];

  const step = tickStepMs(pxPerSec);
  const ticks: TimelineTick[] = [];
  for (let ms = 0; ms <= durationMs + 0.5; ms += step) {
    const rounded = Math.round(ms);
    ticks.push({ ms: rounded, major: Math.round(ms / step) % 5 === 0 });
  }
  return ticks;
}

const TICK_STEPS_MS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000];
const MIN_TICK_GAP_PX = 8;

function tickStepMs(pxPerSec: number): number {
  for (const step of TICK_STEPS_MS) {
    if (msToX(step, pxPerSec) >= MIN_TICK_GAP_PX) return step;
  }
  return TICK_STEPS_MS[TICK_STEPS_MS.length - 1];
}

/** The moment a pointer has hold of, or none where it is not near one. */
export function keyAtX(
  moments: readonly number[],
  x: number,
  pxPerSec: number,
  tolerancePx = KEY_GRAB_PX
): number | null {
  let nearest: number | null = null;
  let closest = Number.POSITIVE_INFINITY;

  for (const ms of moments) {
    const away = Math.abs(msToX(ms, pxPerSec) - x);
    if (away <= tolerancePx && away < closest) {
      nearest = ms;
      closest = away;
    }
  }
  return nearest;
}

/** The clock written the way an editor shows it. */
export function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const hundredths = Math.floor((total % 1000) / 10);
  return `${minutes}:${`${seconds}`.padStart(2, '0')}.${`${hundredths}`.padStart(2, '0')}`;
}
