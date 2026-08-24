import { type CutInEasingName } from '@axe/domain/media/cubic-bezier';
import {
  CUT_IN_TRACKS,
  type CutInKey,
  type CutInTrackName,
  type CutInTrackSet,
  encodeCutInTracks,
  keyIndexAt,
  keyTimes,
  moveKey,
  removeKeyAt,
  sampleTrack,
  upsertKey,
} from '@axe/domain/media/cut-in-keyframe';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';

/**
 * Putting keys down and taking them up.
 *
 * Every property a key can hold also rests somewhere on the layer itself. Where a key
 * stands at the playhead the key is what is written; where none does, the resting value
 * is. That is what lets the same field in the properties panel serve both.
 */

/** Where each track's resting value lives on the layer. */
const RESTING: Record<CutInTrackName, keyof CutInLayer> = {
  x: 'x',
  y: 'y',
  scaleX: 'scaleX',
  scaleY: 'scaleY',
  rotation: 'rotation',
  opacity: 'opacity',
  blur: 'blur',
};

export function restingValue(layer: CutInLayer, track: CutInTrackName): number {
  const value = Number(layer[RESTING[track]]);
  return Number.isFinite(value) ? value : 0;
}

function setResting(layer: CutInLayer, track: CutInTrackName, value: number): void {
  (layer as unknown as Record<string, number>)[RESTING[track] as string] = value;
}

function writeTracks(layer: CutInLayer, tracks: CutInTrackSet): void {
  layer.tracks = encodeCutInTracks(tracks);
}

export function keysOf(layer: CutInLayer, track: CutInTrackName): CutInKey[] {
  return [...(layer.trackSet[track] ?? [])];
}

/** What the layer shows for a track at a moment, whether from a key or from where it rests. */
export function valueAt(layer: CutInLayer, track: CutInTrackName, ms: number): number {
  return sampleTrack(layer.trackSet[track], ms, restingValue(layer, track));
}

export function hasKeyAt(layer: CutInLayer, track: CutInTrackName, ms: number): boolean {
  return keyIndexAt(layer.trackSet[track], ms) >= 0;
}

/** Every moment this layer has a key at, on any track. */
export function layerKeyTimes(layer: CutInLayer): number[] {
  return keyTimes(layer.trackSet);
}

/**
 * Writes a value at a moment.
 *
 * A key already standing there takes it. Otherwise, a track that is already moving takes
 * a new key so the change is not lost the moment the playhead moves, and a track that is
 * not moving simply rests somewhere new.
 */
export function setValueAt(layer: CutInLayer, track: CutInTrackName, ms: number, value: number): void {
  const keys = layer.trackSet[track];
  if (!keys || keys.length < 1) {
    setResting(layer, track, value);
    return;
  }

  writeTracks(layer, { ...layer.trackSet, [track]: upsertKey(keys, { t: ms, v: value }) });
}

/** Puts a key down at the moment, or takes away the one already there. */
export function toggleKeyAt(layer: CutInLayer, track: CutInTrackName, ms: number): boolean {
  const keys = layer.trackSet[track];

  if (keyIndexAt(keys, ms) >= 0) {
    const left = removeKeyAt(keys, ms);
    const tracks = { ...layer.trackSet };
    if (left.length > 0) tracks[track] = left;
    else delete tracks[track];
    writeTracks(layer, tracks);
    return false;
  }

  const value = valueAt(layer, track, ms);
  writeTracks(layer, { ...layer.trackSet, [track]: upsertKey(keys, { t: ms, v: value }) });
  return true;
}

/** Slides every key standing at one moment along to another. */
export function moveLayerKeys(layer: CutInLayer, fromMs: number, toMs: number): boolean {
  const tracks = { ...layer.trackSet };
  let moved = false;

  for (const track of CUT_IN_TRACKS) {
    const keys = tracks[track];
    if (!keys || keyIndexAt(keys, fromMs) < 0) continue;
    tracks[track] = moveKey(keys, fromMs, toMs);
    moved = true;
  }

  if (moved) writeTracks(layer, tracks);
  return moved;
}

/** Takes away every key standing at a moment. */
export function removeLayerKeys(layer: CutInLayer, ms: number): boolean {
  const tracks = { ...layer.trackSet };
  let removed = false;

  for (const track of CUT_IN_TRACKS) {
    const keys = tracks[track];
    if (!keys || keyIndexAt(keys, ms) < 0) continue;

    const left = removeKeyAt(keys, ms);
    if (left.length > 0) tracks[track] = left;
    else delete tracks[track];
    removed = true;
  }

  if (removed) writeTracks(layer, tracks);
  return removed;
}

/** The curve out of a moment, where every key standing there agrees on one. */
export function easingAtMoment(layer: CutInLayer, ms: number): CutInEasingName | null {
  let agreed: CutInEasingName | null = null;

  for (const track of CUT_IN_TRACKS) {
    const keys = layer.trackSet[track];
    const at = keyIndexAt(keys, ms);
    if (!keys || at < 0) continue;

    const curve = keys[at].e ?? 'outCubic';
    if (agreed !== null && agreed !== curve) return null;
    agreed = curve;
  }
  return agreed;
}

/** Gives every key standing at a moment the same curve out of it. */
export function setEasingAtMoment(layer: CutInLayer, ms: number, easing: CutInEasingName): boolean {
  const tracks = { ...layer.trackSet };
  let written = false;

  for (const track of CUT_IN_TRACKS) {
    const keys = tracks[track];
    const at = keyIndexAt(keys, ms);
    if (!keys || at < 0) continue;

    tracks[track] = upsertKey(keys, { ...keys[at], e: easing });
    written = true;
  }

  if (written) writeTracks(layer, tracks);
  return written;
}
