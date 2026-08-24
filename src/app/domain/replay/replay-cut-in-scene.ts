import { type CutInFill, type CutInFillShape, isCutInFillShape } from '@axe/domain/media/cut-in-fill';
import type { CutInTrackSet } from '@axe/domain/media/cut-in-keyframe';
import { parseCutInTracks, sampleTrack } from '@axe/domain/media/cut-in-keyframe';
import type { CutInLayerKind, CutInTextAlign } from '@axe/domain/media/cut-in-layer';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';

/**
 * The scenes of the cut-ins, read back out of a recording.
 *
 * A recording keeps every object there was, so the scene and its layers are already in
 * it — but as sync data rather than as the objects themselves, which the video export
 * cannot build. This reads that back into plain values the painter can draw from.
 */

const SCENE_ALIAS = 'cut-in-scene';
const LAYER_ALIAS = 'cut-in-layer';

export interface ReplayCutInLayer {
  kind: CutInLayerKind;
  hidden: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  blur: number;
  startMs: number;
  endMs: number;
  imageIdentifier: string;
  text: string;
  fontSizePx: number;
  fontWeight: number;
  color: string;
  textAlign: CutInTextAlign;
  strokeColor: string;
  strokeWidthPx: number;
  fillShape: CutInFillShape;
  fillFrom: string;
  fillMid: string;
  fillTo: string;
  fillAngleDeg: number;
  tracks: CutInTrackSet;
}

export interface ReplayCutInScene {
  durationMs: number;
  sceneLoop: boolean;
  backgroundColor: string;
  /** In the order they are drawn. */
  layers: ReplayCutInLayer[];
}

/** What every cut-in in the recording was built from, by the identifier of the cut-in. */
export function cutInScenesOf(snapshots: readonly ReplayObjectSnapshot[]): Map<string, ReplayCutInScene> {
  const scenes = new Map<string, { cutInIdentifier: string; scene: ReplayCutInScene }>();

  for (const snapshot of snapshots) {
    if (snapshot.aliasName !== SCENE_ALIAS) continue;
    const attributes = attributesOf(snapshot);
    scenes.set(snapshot.identifier, {
      cutInIdentifier: text(attributes['cutInIdentifier']),
      scene: {
        durationMs: number(attributes['durationMs'], 3000),
        sceneLoop: flag(attributes['sceneLoop']),
        backgroundColor: text(attributes['backgroundColor']),
        layers: [],
      },
    });
  }
  if (scenes.size < 1) return new Map();

  const ordered: { parent: string; index: number; layer: ReplayCutInLayer }[] = [];
  for (const snapshot of snapshots) {
    if (snapshot.aliasName !== LAYER_ALIAS) continue;

    const parent = text(snapshot.syncData['parentIdentifier']);
    if (!scenes.has(parent)) continue;

    ordered.push({
      parent,
      index: number(snapshot.syncData['majorIndex'], 0) + number(snapshot.syncData['minorIndex'], 0),
      layer: readLayer(attributesOf(snapshot)),
    });
  }

  ordered.sort((left, right) => left.index - right.index);
  for (const entry of ordered) scenes.get(entry.parent)?.scene.layers.push(entry.layer);

  const byCutIn = new Map<string, ReplayCutInScene>();
  for (const { cutInIdentifier, scene } of scenes.values()) {
    if (cutInIdentifier.length > 0 && scene.layers.length > 0) byCutIn.set(cutInIdentifier, scene);
  }
  return byCutIn;
}

/** What a band layer is painted with, in the shape the shared helper understands. */
export function layerFill(layer: ReplayCutInLayer): CutInFill {
  return {
    shape: layer.fillShape,
    from: layer.fillFrom,
    mid: layer.fillMid,
    to: layer.fillTo,
    angleDeg: layer.fillAngleDeg,
  };
}

/** How long the scene runs, never shorter than the layer that finishes last. */
export function replaySceneDurationOf(scene: ReplayCutInScene): number {
  const lastMoment = scene.layers.reduce((last, layer) => Math.max(last, layer.endMs, lastTrackMoment(layer)), 0);
  return Math.min(60_000, Math.max(100, scene.durationMs, lastMoment));
}

/** Everything about a layer at one moment, the way the editor would show it. */
export function replaySampleAt(
  layer: ReplayCutInLayer,
  ms: number,
  durationMs: number
): {
  visible: boolean;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  blur: number;
} {
  const endMs = layer.endMs > 0 ? Math.min(layer.endMs, durationMs) : durationMs;

  return {
    visible: !layer.hidden && ms >= layer.startMs && (ms < endMs || endMs >= durationMs),
    x: sampleTrack(layer.tracks.x, ms, layer.x),
    y: sampleTrack(layer.tracks.y, ms, layer.y),
    scaleX: sampleTrack(layer.tracks.scaleX, ms, layer.scaleX),
    scaleY: sampleTrack(layer.tracks.scaleY, ms, layer.scaleY),
    rotation: sampleTrack(layer.tracks.rotation, ms, layer.rotation),
    opacity: sampleTrack(layer.tracks.opacity, ms, layer.opacity),
    blur: sampleTrack(layer.tracks.blur, ms, layer.blur),
  };
}

/** Every picture a scene needs, so the export can load them before it starts drawing. */
export function sceneImageIdentifiers(scene: ReplayCutInScene): string[] {
  return scene.layers.map((layer) => layer.imageIdentifier).filter((identifier) => identifier.length > 0);
}

function lastTrackMoment(layer: ReplayCutInLayer): number {
  let last = 0;
  for (const keys of Object.values(layer.tracks)) {
    for (const key of keys ?? []) last = Math.max(last, key.t);
  }
  return last;
}

function readLayer(attributes: Record<string, unknown>): ReplayCutInLayer {
  return {
    kind: (text(attributes['kind']) || 'image') as CutInLayerKind,
    hidden: flag(attributes['hidden']),
    x: number(attributes['x'], 0),
    y: number(attributes['y'], 0),
    width: number(attributes['width'], 0),
    height: number(attributes['height'], 0),
    anchorX: number(attributes['anchorX'], 0.5),
    anchorY: number(attributes['anchorY'], 0.5),
    scaleX: number(attributes['scaleX'], 1),
    scaleY: number(attributes['scaleY'], 1),
    rotation: number(attributes['rotation'], 0),
    opacity: number(attributes['opacity'], 1),
    blur: number(attributes['blur'], 0),
    startMs: number(attributes['startMs'], 0),
    endMs: number(attributes['endMs'], 0),
    imageIdentifier: text(attributes['imageIdentifier']),
    text: text(attributes['text']),
    fontSizePx: number(attributes['fontSizePx'], 32),
    fontWeight: number(attributes['fontWeight'], 700),
    color: text(attributes['color']) || '#ffffff',
    textAlign: (text(attributes['textAlign']) || 'center') as CutInTextAlign,
    strokeColor: text(attributes['strokeColor']),
    strokeWidthPx: number(attributes['strokeWidthPx'], 0),
    fillShape: isCutInFillShape(attributes['fillShape']) ? attributes['fillShape'] : 'linear',
    fillFrom: text(attributes['fillFrom']) || '#000000',
    fillMid: text(attributes['fillMid']),
    fillTo: text(attributes['fillTo']),
    fillAngleDeg: number(attributes['fillAngleDeg'], 90),
    tracks: parseCutInTracks(text(attributes['tracks'])),
  };
}

function attributesOf(snapshot: ReplayObjectSnapshot): Record<string, unknown> {
  const attributes = snapshot.syncData['attributes'];
  return typeof attributes === 'object' && attributes !== null ? (attributes as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown, fallback: number): number {
  const read = Number(value);
  return Number.isFinite(read) ? read : fallback;
}

function flag(value: unknown): boolean {
  return value === true || value === 'true';
}
