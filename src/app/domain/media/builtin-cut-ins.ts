import { ImageFile } from '@axe/core/storage/image-file';
import type { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import type { CutInClip } from '@axe/domain/media/cut-in-clip';
import type { CutInEffect } from '@axe/domain/media/cut-in-effect';
import type { CutInFillShape } from '@axe/domain/media/cut-in-fill';
import { type CutInTrackSet, encodeCutInTracks } from '@axe/domain/media/cut-in-keyframe';
import { CutInLayer, type CutInLayerKind, type CutInTextAlign } from '@axe/domain/media/cut-in-layer';
import { CutInScene } from '@axe/domain/media/cut-in-scene';
import { type CutInSound, encodeCutInSounds } from '@axe/domain/media/cut-in-sound';
import { ImageTag } from '@axe/domain/media/image-tag';
import { PresetSound } from '@axe/domain/media/sound-effect';

/**
 * The cut-ins a new room starts with.
 *
 * Both are the shape a summoning cut-in takes: a face filling a window, the sound of it,
 * and the word for that sound stamped across the corner. The older style stands its
 * window upright; the newer one leans it over and tears its edge. Everything but the
 * face is drawn — bands, lines, dots and words — so opening either in the scene editor
 * shows how it was put together, and the face is one field to change.
 *
 * The identifiers are fixed, so everyone in a room ends up with the same two rather than
 * a copy each, the way the built-in effects work.
 */

type PresetSoundKey = Exclude<keyof typeof PresetSound, 'prototype'>;

export const SAMPLE_PORTRAIT_IDENTIFIER = 'cutInSamplePortrait_image';
const SAMPLE_PORTRAIT_URL = './assets/images/cutin_sample_portrait.png';

interface LayerSeed {
  identifier: string;
  name: string;
  kind: CutInLayerKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  skewXDeg?: number;
  clip?: CutInClip;
  effect?: CutInEffect;
  effectStrength?: number;
  effectColor?: string;
  tracks?: CutInTrackSet;

  // fill
  fillShape?: CutInFillShape;
  fillFrom?: string;
  fillMid?: string;
  fillTo?: string;
  fillAngleDeg?: number;
  fillScalePx?: number;

  // image
  portrait?: boolean;
  objectFit?: string;
  objectPosY?: number;
  opacity?: number;

  // text
  text?: string;
  fontSizePx?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: CutInTextAlign;
  strokeColor?: string;
  strokeWidthPx?: number;
}

interface SoundSeed {
  atMs: number;
  /** One of the sounds the tool already carries, by name rather than by identifier. */
  soundKey: PresetSoundKey;
  volume: number;
}

interface CutInSeed {
  identifier: string;
  sceneIdentifier: string;
  name: string;
  width: number;
  height: number;
  durationMs: number;
  sounds: SoundSeed[];
  layers: LayerSeed[];
}

/** The band wiping open across the screen, which is what reads as a flash. */
const WIPE_OPEN: CutInTrackSet = {
  scaleX: [
    { t: 0, v: 0.02, e: 'outCubic' },
    { t: 110, v: 1 },
  ],
  opacity: [
    { t: 0, v: 1, e: 'linear' },
    { t: 950, v: 1, e: 'inCubic' },
    { t: 1080, v: 0 },
  ],
};

/** The leaning window slamming in from the right and settling back upright. */
const SLAM_IN = (restX: number): CutInTrackSet => ({
  x: [
    { t: 120, v: restX + 980, e: 'outCubic' },
    { t: 380, v: restX },
  ],
  rotation: [
    { t: 120, v: -26, e: 'outCubic' },
    { t: 380, v: -13 },
  ],
  opacity: [
    { t: 120, v: 1, e: 'linear' },
    { t: 1250, v: 1, e: 'inCubic' },
    { t: 1400, v: 0 },
  ],
});

export const DEFAULT_CUT_IN_SEEDS: readonly CutInSeed[] = [
  {
    identifier: 'sample-cut-in-flash',
    sceneIdentifier: 'sample-cut-in-flash-scene',
    name: '見本 : カッ',
    width: 1000,
    height: 250,
    durationMs: 1100,
    sounds: [{ atMs: 0, soundKey: 'sfHit', volume: 90 }],
    layers: [
      {
        identifier: 'sample-cut-in-flash-frame',
        name: '帯の縁',
        kind: 'fill',
        x: 0,
        y: 24,
        width: 1000,
        height: 202,
        rotation: -2,
        clip: 'slant',
        fillFrom: '#d8f1ff',
        tracks: WIPE_OPEN,
      },
      {
        identifier: 'sample-cut-in-flash-plate',
        name: '帯の下地',
        kind: 'fill',
        x: 6,
        y: 30,
        width: 988,
        height: 190,
        rotation: -2,
        clip: 'slant',
        fillShape: 'linear',
        fillFrom: '#0a1c40',
        fillTo: '#04102a',
        fillAngleDeg: 180,
        tracks: WIPE_OPEN,
      },
      {
        identifier: 'sample-cut-in-flash-face',
        name: '目 : 画像を差し替える',
        kind: 'image',
        x: 6,
        y: 30,
        width: 988,
        height: 190,
        rotation: -2,
        clip: 'slant',
        portrait: true,
        objectFit: 'cover',
        // Any portrait dropped in here is pulled up to the eyes rather than the chest.
        objectPosY: 34,
        tracks: {
          ...WIPE_OPEN,
          scaleX: [
            { t: 0, v: 0.02, e: 'outCubic' },
            { t: 100, v: 1.06 },
            { t: 420, v: 1 },
          ],
          scaleY: [
            { t: 100, v: 1.06, e: 'outCubic' },
            { t: 420, v: 1 },
          ],
        },
      },
      {
        identifier: 'sample-cut-in-flash-rays',
        name: '集中線',
        kind: 'fill',
        x: 6,
        y: 30,
        width: 988,
        height: 190,
        rotation: -2,
        clip: 'slant',
        fillShape: 'speedlines',
        fillFrom: '#bfe9ff',
        fillTo: '#0a1c40',
        fillAngleDeg: 0,
        fillScalePx: 22,
        tracks: {
          opacity: [
            { t: 60, v: 0, e: 'linear' },
            { t: 120, v: 0.55 },
            { t: 460, v: 0.55, e: 'inCubic' },
            { t: 700, v: 0 },
          ],
        },
      },
      {
        identifier: 'sample-cut-in-flash-sheen',
        name: '走査光',
        kind: 'fill',
        x: 0,
        y: 30,
        width: 300,
        height: 190,
        rotation: -2,
        skewXDeg: -26,
        effect: 'glow',
        effectStrength: 0.9,
        effectColor: '#bfe9ff',
        fillShape: 'linear',
        fillFrom: '#bfe9ff00',
        fillMid: '#eafbff',
        fillTo: '#bfe9ff00',
        fillAngleDeg: 90,
        tracks: {
          x: [
            { t: 120, v: -340, e: 'outCubic' },
            { t: 430, v: 1040 },
          ],
          opacity: [
            { t: 120, v: 0, e: 'linear' },
            { t: 170, v: 1 },
            { t: 360, v: 1, e: 'inCubic' },
            { t: 450, v: 0 },
          ],
        },
      },
      {
        identifier: 'sample-cut-in-flash-word',
        name: '文字 : カッ',
        kind: 'text',
        x: 660,
        y: 34,
        width: 330,
        height: 130,
        rotation: -14,
        text: 'カッ',
        fontSizePx: 96,
        fontWeight: 900,
        color: '#eafbff',
        textAlign: 'right',
        strokeColor: '#0a1c40',
        strokeWidthPx: 5,
        effect: 'glow',
        effectStrength: 0.7,
        effectColor: '#9fdcff',
        tracks: {
          x: [
            { t: 150, v: 760, e: 'outBack' },
            { t: 300, v: 660 },
          ],
          scaleX: [
            { t: 150, v: 0.5, e: 'outBack' },
            { t: 300, v: 1 },
          ],
          scaleY: [
            { t: 150, v: 0.5, e: 'outBack' },
            { t: 300, v: 1 },
          ],
          opacity: [
            { t: 150, v: 0, e: 'linear' },
            { t: 200, v: 1 },
            { t: 950, v: 1, e: 'inCubic' },
            { t: 1080, v: 0 },
          ],
        },
      },
    ],
  },
  {
    identifier: 'sample-cut-in-tear',
    sceneIdentifier: 'sample-cut-in-tear-scene',
    name: '見本 : ブチッ',
    width: 800,
    height: 450,
    durationMs: 1400,
    sounds: [{ atMs: 0, soundKey: 'slashIai', volume: 90 }],
    layers: [
      {
        identifier: 'sample-cut-in-tear-dim',
        name: '暗幕',
        kind: 'fill',
        x: 0,
        y: 0,
        width: 800,
        height: 450,
        fillFrom: '#0a0a0ccc',
        tracks: {
          opacity: [
            { t: 0, v: 0, e: 'linear' },
            { t: 50, v: 1 },
            { t: 1250, v: 1, e: 'inCubic' },
            { t: 1400, v: 0 },
          ],
        },
      },
      {
        identifier: 'sample-cut-in-tear-dots',
        name: '網点',
        kind: 'fill',
        x: 0,
        y: 0,
        width: 800,
        height: 450,
        fillShape: 'halftone',
        fillFrom: '#5c0512',
        fillScalePx: 14,
        opacity: 0.7,
        tracks: {
          opacity: [
            { t: 0, v: 0, e: 'linear' },
            { t: 80, v: 0.7 },
            { t: 1250, v: 0.7, e: 'inCubic' },
            { t: 1400, v: 0 },
          ],
        },
      },
      {
        identifier: 'sample-cut-in-tear-rays',
        name: '集中線',
        kind: 'fill',
        x: 0,
        y: 0,
        width: 800,
        height: 450,
        fillShape: 'speedlines',
        fillFrom: '#e0142f',
        fillTo: '#0a0a0c',
        fillAngleDeg: 8,
        fillScalePx: 34,
        tracks: {
          scaleX: [
            { t: 60, v: 1.7, e: 'outCubic' },
            { t: 480, v: 1 },
          ],
          scaleY: [
            { t: 60, v: 1.7, e: 'outCubic' },
            { t: 480, v: 1 },
          ],
          opacity: [
            { t: 60, v: 0, e: 'linear' },
            { t: 130, v: 0.9 },
            { t: 520, v: 0.9, e: 'inCubic' },
            { t: 760, v: 0 },
          ],
        },
      },
      {
        identifier: 'sample-cut-in-tear-rip',
        name: '裂け目',
        kind: 'fill',
        x: -300,
        y: 205,
        width: 1400,
        height: 44,
        rotation: -24,
        fillFrom: '#ffffff',
        tracks: {
          x: [
            { t: 0, v: 900, e: 'outCubic' },
            { t: 180, v: -300 },
          ],
          opacity: [
            { t: 0, v: 0, e: 'linear' },
            { t: 40, v: 1 },
            { t: 420, v: 1, e: 'inCubic' },
            { t: 600, v: 0 },
          ],
        },
      },
      {
        identifier: 'sample-cut-in-tear-frame',
        name: '枠',
        kind: 'fill',
        x: 236,
        y: 22,
        width: 348,
        height: 410,
        rotation: -13,
        skewXDeg: -9,
        clip: 'torn',
        fillFrom: '#0b0b0d',
        tracks: SLAM_IN(236),
      },
      {
        identifier: 'sample-cut-in-tear-plate',
        name: '枠の中',
        kind: 'fill',
        x: 246,
        y: 32,
        width: 328,
        height: 390,
        rotation: -13,
        skewXDeg: -9,
        clip: 'torn',
        fillShape: 'linear',
        fillFrom: '#e0142f',
        fillMid: '#a30c22',
        fillTo: '#5c0512',
        fillAngleDeg: 120,
        tracks: SLAM_IN(246),
      },
      {
        identifier: 'sample-cut-in-tear-face',
        name: '顔 : 画像を差し替える',
        kind: 'image',
        x: 246,
        y: 32,
        width: 328,
        height: 390,
        rotation: -13,
        skewXDeg: -9,
        clip: 'torn',
        portrait: true,
        objectFit: 'cover',
        tracks: {
          ...SLAM_IN(246),
          opacity: [
            { t: 120, v: 0, e: 'linear' },
            { t: 240, v: 1 },
            { t: 1250, v: 1, e: 'inCubic' },
            { t: 1400, v: 0 },
          ],
        },
      },
      {
        identifier: 'sample-cut-in-tear-word',
        name: '文字 : ブチッ',
        kind: 'text',
        x: 10,
        y: 288,
        width: 500,
        height: 150,
        rotation: -7,
        text: 'ブチッ',
        fontSizePx: 104,
        fontWeight: 900,
        color: '#ffffff',
        textAlign: 'left',
        strokeColor: '#0b0b0d',
        strokeWidthPx: 7,
        effect: 'shake',
        effectStrength: 0.5,
        tracks: {
          rotation: [
            { t: 300, v: -30, e: 'outBack' },
            { t: 560, v: -7 },
          ],
          scaleX: [
            { t: 300, v: 0.4, e: 'outBack' },
            { t: 560, v: 1 },
            { t: 1250, v: 1, e: 'inCubic' },
            { t: 1400, v: 1.2 },
          ],
          scaleY: [
            { t: 300, v: 0.4, e: 'outBack' },
            { t: 560, v: 1 },
            { t: 1250, v: 1, e: 'inCubic' },
            { t: 1400, v: 1.2 },
          ],
          opacity: [
            { t: 300, v: 0, e: 'linear' },
            { t: 360, v: 1 },
            { t: 1250, v: 1, e: 'inCubic' },
            { t: 1400, v: 0 },
          ],
        },
      },
    ],
  },
] as const;

/**
 * Makes the samples, leaving alone any that are already there.
 *
 * Called on a fresh store, before a room's own objects arrive, so everyone builds the
 * same two under the same identifiers and syncing settles them into one set.
 */
export function createDefaultCutIns(imageStorage: ImageStorage): CutIn[] {
  const portrait = registerPortrait(imageStorage);
  const made: CutIn[] = [];

  for (const seed of DEFAULT_CUT_IN_SEEDS) {
    const cutIn = new CutIn(seed.identifier);
    cutIn.initialize();
    if (ObjectStore.instance.get(seed.identifier) !== cutIn) continue;

    applyCutInSeed(cutIn, seed, portrait);
    made.push(cutIn);
  }
  return made;
}

/** The face the samples come with, which is one field away from being someone else's. */
function registerPortrait(imageStorage: ImageStorage): string {
  const context = ImageFile.createEmpty(SAMPLE_PORTRAIT_IDENTIFIER).toContext();
  context.url = SAMPLE_PORTRAIT_URL;
  const file = imageStorage.add(context);
  ImageTag.create(file.identifier).tag = 'カットイン';
  return file.identifier;
}

function applyCutInSeed(cutIn: CutIn, seed: CutInSeed, portrait: string): void {
  cutIn.name = seed.name;
  cutIn.width = seed.width;
  cutIn.height = seed.height;
  cutIn.originalSize = false;
  cutIn.keepImageAspect = false;
  cutIn.imageIdentifier = '';
  cutIn.frameless = true;
  cutIn.chatActivate = true;

  const scene = new CutInScene(seed.sceneIdentifier);
  scene.initialize();
  if (ObjectStore.instance.get(seed.sceneIdentifier) !== scene) return;

  scene.cutInIdentifier = cutIn.identifier;
  scene.durationMs = seed.durationMs;
  scene.sounds = encodeCutInSounds(soundsOf(seed));
  for (const layerSeed of seed.layers) scene.appendChild(makeLayer(layerSeed, portrait));
}

/** The sounds the tool already carries, looked up by name at the moment they are needed. */
function soundsOf(seed: CutInSeed): CutInSound[] {
  const sounds: CutInSound[] = [];
  for (const sound of seed.sounds) {
    const identifier = PresetSound[sound.soundKey];
    if (identifier) sounds.push({ t: sound.atMs, a: identifier, v: sound.volume });
  }
  return sounds;
}

function makeLayer(seed: LayerSeed, portrait: string): CutInLayer {
  const layer = new CutInLayer(seed.identifier);
  layer.initialize();

  layer.name = seed.name;
  layer.kind = seed.kind;
  layer.x = seed.x;
  layer.y = seed.y;
  layer.width = seed.width;
  layer.height = seed.height;
  if (seed.rotation !== undefined) layer.rotation = seed.rotation;
  if (seed.skewXDeg !== undefined) layer.skewXDeg = seed.skewXDeg;
  if (seed.clip) layer.clip = seed.clip;
  if (seed.opacity !== undefined) layer.opacity = seed.opacity;
  if (seed.effect) layer.effect = seed.effect;
  if (seed.effectStrength !== undefined) layer.effectStrength = seed.effectStrength;
  if (seed.effectColor) layer.effectColor = seed.effectColor;
  if (seed.tracks) layer.tracks = encodeCutInTracks(seed.tracks);

  if (seed.fillShape) layer.fillShape = seed.fillShape;
  if (seed.fillFrom) layer.fillFrom = seed.fillFrom;
  if (seed.fillMid) layer.fillMid = seed.fillMid;
  if (seed.fillTo) layer.fillTo = seed.fillTo;
  if (seed.fillAngleDeg !== undefined) layer.fillAngleDeg = seed.fillAngleDeg;
  if (seed.fillScalePx !== undefined) layer.fillScalePx = seed.fillScalePx;

  if (seed.portrait) layer.imageIdentifier = portrait;
  if (seed.objectFit) layer.objectFit = seed.objectFit;
  if (seed.objectPosY !== undefined) layer.objectPosY = seed.objectPosY;

  if (seed.text) layer.text = seed.text;
  if (seed.fontSizePx !== undefined) layer.fontSizePx = seed.fontSizePx;
  if (seed.fontWeight !== undefined) layer.fontWeight = seed.fontWeight;
  if (seed.color) layer.color = seed.color;
  if (seed.textAlign) layer.textAlign = seed.textAlign;
  if (seed.strokeColor) layer.strokeColor = seed.strokeColor;
  if (seed.strokeWidthPx !== undefined) layer.strokeWidthPx = seed.strokeWidthPx;

  return layer;
}
