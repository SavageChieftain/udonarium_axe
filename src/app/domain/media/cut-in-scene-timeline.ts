import { type CutInEasingName, DEFAULT_CUT_IN_EASING, easingCss } from '@axe/domain/media/cubic-bezier';
import { type CutInKey, keyTimes, sampleTrack, surroundingKeys } from '@axe/domain/media/cut-in-keyframe';
import type { CutInLayer } from '@axe/domain/media/cut-in-layer';
import type { CutInScene } from '@axe/domain/media/cut-in-scene';

/**
 * Turning what a layer does into what the browser is handed.
 *
 * A layer becomes one animation running the whole length of the scene, rather than one
 * starting late. Every layer then shares a clock, and dropping the same `currentTime`
 * into each of them puts the whole scene at one moment — which is what the scrubber
 * needs. When the layer is on screen is baked into the opacity as a pair of keyframes
 * sharing a moment, which is how a jump is written in this form.
 *
 * Tracks are kept apart while they are edited and merged only here, because a keyframe
 * in the Web Animations sense carries every property at once. Where the tracks agree on
 * where their keys fall, a stretch is handed over as the curve it was drawn with. Where
 * they disagree, the curve cannot be named for the stretch, so it is cut into pieces
 * short enough that straight lines between them follow it.
 */

export interface CutInSample {
  /** Whether the layer is on screen at that moment. */
  visible: boolean;
  /** Where the layer sits, in the cut-in's own coordinates. */
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  /** In degrees. */
  rotation: number;
  /** From 0 to 1. */
  opacity: number;
  /** In pixels. */
  blur: number;
}

// A type rather than an interface, so it satisfies the index signature a Keyframe carries.
export type CutInFrame = {
  /** From 0 to 1, along the scene. */
  offset: number;
  transform: string;
  opacity: number;
  filter: string;
  /** The curve out of this frame. The last frame carries none. */
  easing?: string;
};

/** How finely a stretch that cannot be named is cut up. */
const MAX_STEPS_PER_STRETCH = 12;
const MS_PER_STEP = 40;

/** How long the scene runs, whether or not there is one. */
export function sceneDurationOf(scene: CutInScene | null | undefined): number {
  return scene ? scene.runningMs : 0;
}

/** When the layer comes on and goes off, held inside the scene. */
export function layerWindow(layer: CutInLayer, sceneDurationMs: number): { startMs: number; endMs: number } {
  const startMs = clamp(numberOr(layer.startMs, 0), 0, sceneDurationMs);
  const asked = numberOr(layer.endMs, 0);
  const endMs = asked > 0 ? clamp(asked, startMs, sceneDurationMs) : sceneDurationMs;
  return { startMs, endMs };
}

/** Everything about a layer at one moment. Its time on screen decides `visible`, not the values. */
export function sampleLayerAt(layer: CutInLayer, ms: number, sceneDurationMs = 0): CutInSample {
  const tracks = layer.trackSet;
  const running = sceneDurationMs > 0 ? sceneDurationMs : Math.max(1, layer.lastMomentMs);
  const { startMs, endMs } = layerWindow(layer, running);

  return {
    visible: isShown(ms, startMs, endMs, running),
    x: sampleTrack(tracks.x, ms, numberOr(layer.x, 0)),
    y: sampleTrack(tracks.y, ms, numberOr(layer.y, 0)),
    scaleX: sampleTrack(tracks.scaleX, ms, numberOr(layer.scaleX, 1)),
    scaleY: sampleTrack(tracks.scaleY, ms, numberOr(layer.scaleY, 1)),
    rotation: sampleTrack(tracks.rotation, ms, numberOr(layer.rotation, 0)),
    opacity: sampleTrack(tracks.opacity, ms, numberOr(layer.opacity, 1)),
    blur: sampleTrack(tracks.blur, ms, numberOr(layer.blur, 0)),
  };
}

export function layerTransform(sample: CutInSample): string {
  const x = round(sample.x);
  const y = round(sample.y);
  const rotation = round(sample.rotation);
  return `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${round(sample.scaleX)}, ${round(sample.scaleY)})`;
}

export function layerFilter(sample: CutInSample): string {
  return sample.blur > 0 ? `blur(${round(sample.blur)}px)` : 'none';
}

/** What the layer turns and grows around, written the way CSS wants it. */
export function layerOrigin(layer: CutInLayer): string {
  return `${round(numberOr(layer.anchorX, 0.5) * 100)}% ${round(numberOr(layer.anchorY, 0.5) * 100)}%`;
}

/** The keyframes a layer is handed to the browser as. */
export function toWebAnimationFrames(layer: CutInLayer, sceneDurationMs: number): CutInFrame[] {
  const running = Math.max(1, sceneDurationMs);
  const { startMs, endMs } = layerWindow(layer, running);
  const marks = marksOf(layer, running, startMs, endMs);

  const frames: CutInFrame[] = [];
  for (let at = 0; at < marks.length; at++) {
    const ms = marks[at];
    const next = marks[at + 1];
    const curve = next === undefined ? 'linear' : oneCurveBetween(layer, ms, next);
    const easing = easingCss(curve ?? 'linear');

    // Two frames sharing a moment is how a jump is written, so a layer arrives and
    // leaves rather than fading at the edges of its time on screen.
    if (ms === startMs && startMs > 0) frames.push(frameAt(layer, ms, running, easing, 0));
    if (ms === endMs && endMs < running) {
      frames.push(frameAt(layer, ms, running, easing, sampleLayerAt(layer, ms, running).opacity));
    }
    frames.push(frameAt(layer, ms, running, easing));

    if (next === undefined || curve !== null) continue;
    for (const between of stepsBetween(ms, next)) {
      frames.push(frameAt(layer, between, running, easingCss('linear')));
    }
  }

  if (frames.length > 0) delete frames[frames.length - 1].easing;
  return frames;
}

/** The moments every track, and the layer's own time on screen, ask for. */
function marksOf(layer: CutInLayer, running: number, startMs: number, endMs: number): number[] {
  const wanted = new Set<number>([0, running, startMs, endMs]);
  for (const ms of keyTimes(layer.trackSet)) {
    if (ms >= 0 && ms <= running) wanted.add(ms);
  }
  return [...wanted].sort((left, right) => left - right);
}

/**
 * The one curve this whole stretch travels along, or none where there is no such thing.
 *
 * A track that is not changing across the stretch has no say. Where the tracks that are
 * changing all leave a key at its start, reach a key at its end, and were drawn with the
 * same curve, that curve describes the stretch exactly.
 */
function oneCurveBetween(layer: CutInLayer, fromMs: number, toMs: number): CutInEasingName | null {
  let agreed: CutInEasingName | null = null;

  for (const keys of Object.values(layer.trackSet)) {
    const { prev, next } = surroundingKeys(keys as CutInKey[], fromMs);
    if (!prev || !next || prev.v === next.v) continue;
    if (prev.t !== fromMs || next.t !== toMs) return null;

    const curve = prev.e ?? DEFAULT_CUT_IN_EASING;
    if (agreed !== null && agreed !== curve) return null;
    agreed = curve;
  }

  return agreed ?? 'linear';
}

function stepsBetween(fromMs: number, toMs: number): number[] {
  const span = toMs - fromMs;
  if (span <= 0) return [];

  const steps = Math.min(MAX_STEPS_PER_STRETCH, Math.max(1, Math.round(span / MS_PER_STEP)));
  const between: number[] = [];
  for (let step = 1; step < steps; step++) between.push(fromMs + (span * step) / steps);
  return between;
}

function frameAt(layer: CutInLayer, ms: number, running: number, easing: string, opacity?: number): CutInFrame {
  const sample = sampleLayerAt(layer, ms, running);
  const { startMs, endMs } = layerWindow(layer, running);
  const shown = opacity ?? (isShown(ms, startMs, endMs, running) ? sample.opacity : 0);

  return {
    offset: clamp(ms / running, 0, 1),
    transform: layerTransform(sample),
    opacity: clamp(shown, 0, 1),
    filter: layerFilter(sample),
    easing,
  };
}

function isShown(ms: number, startMs: number, endMs: number, running: number): boolean {
  return ms >= startMs && (ms < endMs || endMs >= running);
}

function numberOr(value: unknown, fallback: number): number {
  const read = Number(value);
  return Number.isFinite(read) ? read : fallback;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
