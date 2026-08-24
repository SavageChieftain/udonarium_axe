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
import type { CutInWipe } from '@axe/domain/media/cut-in-wipe';
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
export const SAMPLE_FACE_IDENTIFIER = 'cutInSampleFace_image';
const SAMPLE_PORTRAIT_URL = './assets/images/cutin_sample_portrait.png';
const SAMPLE_FACE_URL = './assets/images/cutin_sample_face.png';

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
  wipeShape?: CutInWipe;
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
  face?: boolean;
  objectFit?: string;
  objectPosY?: number;
  opacity?: number;

  // text
  text?: string;
  vertical?: boolean;
  letterSpacingPx?: number;
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

/**
 * The tear running along from the left like a zip being pulled.
 *
 * The point races ahead down the middle and the gap widens behind it, which is what the
 * wipe does; the whole gash is there from the start, only not yet let in.
 */
const RIP_OPEN: CutInTrackSet = {
  wipe: [
    { t: 0, v: 0, e: 'outQuad' },
    { t: 300, v: 1 },
  ],
  opacity: [
    { t: 0, v: 1, e: 'linear' },
    { t: 1320, v: 1, e: 'inCubic' },
    { t: 1500, v: 0 },
  ],
};

/** The word snapping in at the end of the band, both parts of it together. */
const WORD_IN: CutInTrackSet = {
  scaleX: [
    { t: 170, v: 0.45, e: 'outBack' },
    { t: 330, v: 1 },
  ],
  scaleY: [
    { t: 170, v: 0.45, e: 'outBack' },
    { t: 330, v: 1 },
  ],
  opacity: [
    { t: 170, v: 0, e: 'linear' },
    { t: 220, v: 1 },
    { t: 950, v: 1, e: 'inCubic' },
    { t: 1080, v: 0 },
  ],
};

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
        name: '文字 : カ',
        kind: 'text',
        x: 786,
        y: -18,
        width: 150,
        height: 160,
        rotation: -12,
        text: 'カ',
        vertical: true,
        fontSizePx: 124,
        fontWeight: 900,
        color: '#eafbff',
        textAlign: 'center',
        strokeColor: '#0a1c40',
        strokeWidthPx: 6,
        effect: 'glow',
        effectStrength: 0.7,
        effectColor: '#9fdcff',
        tracks: WORD_IN,
      },
      {
        identifier: 'sample-cut-in-flash-word-small',
        name: '文字 : ッ',
        kind: 'text',
        x: 872,
        y: 118,
        width: 110,
        height: 120,
        rotation: -12,
        text: 'ッ',
        vertical: true,
        fontSizePx: 76,
        fontWeight: 900,
        color: '#eafbff',
        textAlign: 'center',
        strokeColor: '#0a1c40',
        strokeWidthPx: 5,
        effect: 'glow',
        effectStrength: 0.7,
        effectColor: '#9fdcff',
        tracks: WORD_IN,
      },
    ],
  },
  {
    identifier: 'sample-cut-in-tear',
    sceneIdentifier: 'sample-cut-in-tear-scene',
    name: '見本 : ブチッ',
    width: 1240,
    height: 420,
    durationMs: 1500,
    sounds: [{ atMs: 0, soundKey: 'slashIai', volume: 90 }],
    layers: [
      {
        identifier: 'sample-cut-in-tear-backing',
        name: '裂け目の裏地',
        kind: 'fill',
        x: -12,
        y: 66,
        width: 1264,
        height: 300,
        rotation: -5,
        clip: 'gash',
        wipeShape: 'chevronRight',
        fillFrom: '#e10f22',
        tracks: RIP_OPEN,
      },
      {
        identifier: 'sample-cut-in-tear-edge',
        name: '裂け目の縁',
        kind: 'fill',
        x: 0,
        y: 72,
        width: 1240,
        height: 288,
        rotation: -5,
        clip: 'gash',
        wipeShape: 'chevronRight',
        fillFrom: '#ffffff',
        tracks: RIP_OPEN,
      },
      {
        identifier: 'sample-cut-in-tear-face',
        name: '目 : 画像を差し替える',
        kind: 'image',
        x: 10,
        y: 80,
        width: 1220,
        height: 272,
        rotation: -5,
        clip: 'gash',
        wipeShape: 'chevronRight',
        face: true,
        objectFit: 'cover',
        objectPosY: 50,
        tracks: {
          ...RIP_OPEN,
          opacity: [
            { t: 70, v: 0, e: 'linear' },
            { t: 150, v: 1 },
            { t: 1320, v: 1, e: 'inCubic' },
            { t: 1500, v: 0 },
          ],
        },
      },
      {
        identifier: 'sample-cut-in-tear-word',
        name: '文字 : ブチッ',
        kind: 'text',
        x: 930,
        y: -30,
        width: 300,
        height: 420,
        rotation: 8,
        text: 'ブチッ',
        vertical: true,
        letterSpacingPx: -14,
        fontSizePx: 104,
        fontWeight: 900,
        color: '#ffffff',
        textAlign: 'center',
        strokeColor: '#0b0b0d',
        strokeWidthPx: 8,
        effect: 'shake',
        effectStrength: 0.4,
        tracks: {
          x: [
            { t: 200, v: 1260, e: 'outBack' },
            { t: 440, v: 930 },
          ],
          rotation: [
            { t: 200, v: 26, e: 'outBack' },
            { t: 440, v: 8 },
          ],
          opacity: [
            { t: 200, v: 0, e: 'linear' },
            { t: 260, v: 1 },
            { t: 1320, v: 1, e: 'inCubic' },
            { t: 1500, v: 0 },
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
  const pictures = {
    portrait: registerPicture(imageStorage, SAMPLE_PORTRAIT_IDENTIFIER, SAMPLE_PORTRAIT_URL),
    face: registerPicture(imageStorage, SAMPLE_FACE_IDENTIFIER, SAMPLE_FACE_URL),
  };
  const made: CutIn[] = [];

  for (const seed of DEFAULT_CUT_IN_SEEDS) {
    const cutIn = new CutIn(seed.identifier);
    cutIn.initialize();
    if (ObjectStore.instance.get(seed.identifier) !== cutIn) continue;

    applyCutInSeed(cutIn, seed, pictures);
    made.push(cutIn);
  }
  return made;
}

/** The faces the samples come with, each one field away from being someone else's. */
function registerPicture(imageStorage: ImageStorage, identifier: string, url: string): string {
  const context = ImageFile.createEmpty(identifier).toContext();
  context.url = url;
  const file = imageStorage.add(context);
  ImageTag.create(file.identifier).tag = 'カットイン';
  return file.identifier;
}

interface SamplePictures {
  portrait: string;
  face: string;
}

function applyCutInSeed(cutIn: CutIn, seed: CutInSeed, pictures: SamplePictures): void {
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
  for (const layerSeed of seed.layers) scene.appendChild(makeLayer(layerSeed, pictures));
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

function makeLayer(seed: LayerSeed, pictures: SamplePictures): CutInLayer {
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
  if (seed.wipeShape) layer.wipeShape = seed.wipeShape;
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

  if (seed.portrait) layer.imageIdentifier = pictures.portrait;
  if (seed.face) layer.imageIdentifier = pictures.face;
  if (seed.objectFit) layer.objectFit = seed.objectFit;
  if (seed.objectPosY !== undefined) layer.objectPosY = seed.objectPosY;

  if (seed.text) layer.text = seed.text;
  if (seed.vertical !== undefined) layer.vertical = seed.vertical;
  if (seed.letterSpacingPx !== undefined) layer.letterSpacingPx = seed.letterSpacingPx;
  if (seed.fontSizePx !== undefined) layer.fontSizePx = seed.fontSizePx;
  if (seed.fontWeight !== undefined) layer.fontWeight = seed.fontWeight;
  if (seed.color) layer.color = seed.color;
  if (seed.textAlign) layer.textAlign = seed.textAlign;
  if (seed.strokeColor) layer.strokeColor = seed.strokeColor;
  if (seed.strokeWidthPx !== undefined) layer.strokeWidthPx = seed.strokeWidthPx;

  return layer;
}
