import { TestBed } from '@angular/core/testing';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import {
  createDefaultCutIns,
  DEFAULT_CUT_IN_SEEDS,
  SAMPLE_FACE_IDENTIFIER,
  SAMPLE_PORTRAIT_IDENTIFIER,
} from '@axe/domain/media/builtin-cut-ins';
import { CutIn } from '@axe/domain/media/cut-in';
import { sceneDurationOf, toWebAnimationFrames } from '@axe/domain/media/cut-in-scene-timeline';

describe('the cut-ins a new room starts with', () => {
  let store: ObjectStore;
  let imageStorage: ImageStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    imageStorage = ImageStorage.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    imageStorage.images.forEach((image) => imageStorage.delete(image.identifier));
  });

  const made = () => createDefaultCutIns(imageStorage);

  it('names each one once', () => {
    const identifiers = DEFAULT_CUT_IN_SEEDS.map((seed) => seed.identifier);

    expect(new Set(identifiers).size).toBe(identifiers.length);
  });

  it('makes one of each', () => {
    expect(made()).toHaveLength(DEFAULT_CUT_IN_SEEDS.length);
    expect(store.getObjects(CutIn)).toHaveLength(DEFAULT_CUT_IN_SEEDS.length);
  });

  it('makes no second copy for someone joining a room that has them', () => {
    made();
    made();

    expect(store.getObjects(CutIn)).toHaveLength(DEFAULT_CUT_IN_SEEDS.length);
  });

  it('registers the faces it comes with, one identifier each', () => {
    made();
    made();

    for (const identifier of [SAMPLE_PORTRAIT_IDENTIFIER, SAMPLE_FACE_IDENTIFIER]) {
      expect(imageStorage.get(identifier)).not.toBeNull();
      expect(imageStorage.images.filter((image) => image.identifier === identifier)).toHaveLength(1);
    }
  });

  it('shows a face through each of them, cropped to the eyes', () => {
    const [flash, tear] = made();
    const faceOf = (cutIn: CutIn) => cutIn.scene!.layers.filter((layer) => layer.kind === 'image');

    for (const cutIn of [flash, tear]) {
      expect(faceOf(cutIn)).toHaveLength(1);
      expect(faceOf(cutIn)[0].objectFit).toBe('cover');
      // Never so far down the picture that a portrait would show its chest.
      expect(faceOf(cutIn)[0].objectPosY).toBeLessThanOrEqual(50);
      expect(faceOf(cutIn)[0].name).toContain('差し替える');
    }

    expect(faceOf(flash)[0].imageIdentifier).toBe(SAMPLE_PORTRAIT_IDENTIFIER);
    expect(faceOf(tear)[0].imageIdentifier).toBe(SAMPLE_FACE_IDENTIFIER);
  });

  it('stamps the word for the sound it makes', () => {
    const words = made().map((cutIn) => cutIn.scene?.layers.find((layer) => layer.kind === 'text')?.text);

    expect(words).toEqual(['カッ', 'ブチッ']);
  });

  it('lays the older one out as a band across the screen', () => {
    const [flash] = made();
    const band = flash.scene!.layers.find((layer) => layer.name === '帯の縁')!;

    // Wide and short with its ends cut on the diagonal, which is the shape of it.
    expect(flash.width / flash.height).toBeGreaterThan(3);
    expect(band.width / band.height).toBeGreaterThan(3);
    expect(band.clip).toBe('slant');
  });

  it('rips the newer one open as a gash rather than opening a window', () => {
    const [, tear] = made();
    const edge = tear.scene!.layers.find((layer) => layer.name === '裂け目の縁')!;

    expect(edge.clip).toBe('gash');
    // Long and shallow, which is the shape of something torn rather than cut out.
    expect(edge.width / edge.height).toBeGreaterThan(3.5);
    // It runs along from the left rather than arriving from somewhere or opening at once.
    expect(edge.wipeShape).toBe('chevronRight');
    expect(edge.trackSet.wipe?.[0].v).toBe(0);
    expect(edge.trackSet.wipe?.[1].v).toBe(1);
    expect(edge.trackSet.x).toBeUndefined();
  });

  it('unzips every torn layer together', () => {
    const [, tear] = made();
    const torn = tear.scene!.layers.filter((layer) => layer.clip === 'gash');

    expect(torn.length).toBeGreaterThan(2);
    for (const layer of torn) {
      expect(layer.wipeShape).toBe('chevronRight');
      expect(layer.trackSet.wipe).toEqual(torn[0].trackSet.wipe);
    }
  });

  it('lets the red backing show past the torn white edge', () => {
    const [, tear] = made();
    const layers = tear.scene!.layers;
    const backing = layers.find((layer) => layer.name === '裂け目の裏地')!;
    const edge = layers.find((layer) => layer.name === '裂け目の縁')!;
    const face = layers.find((layer) => layer.kind === 'image')!;

    // Each is torn to the same outline and sits a little inside the one behind it.
    for (const layer of [backing, edge, face]) expect(layer.clip).toBe('gash');
    expect(backing.width).toBeGreaterThan(edge.width);
    expect(edge.width).toBeGreaterThan(face.width);
    expect(layers.indexOf(backing)).toBeLessThan(layers.indexOf(edge));
  });

  it('stacks the newer word down the right rather than along the band', () => {
    const [, tear] = made();
    const word = tear.scene!.layers.find((layer) => layer.kind === 'text')!;

    expect(word.vertical).toBe(true);
    expect(word.letterSpacingPx).toBeLessThan(0);
    expect(word.height).toBeGreaterThan(word.width);
    expect(word.x).toBeGreaterThan(tear.width / 2);
    // It leans the other way from the tear, and reaches past the top of it.
    expect(word.rotation).toBeGreaterThan(0);
    expect(word.y).toBeLessThan(0);
  });

  it('lays lines converging on the middle behind the band', () => {
    const [flash] = made();
    const rays = flash.scene!.layers.find((layer) => layer.fillShape === 'speedlines');

    expect(rays).toBeDefined();
    expect(rays!.width).toBeGreaterThan(flash.width * 0.9);
  });

  it('plays without a frame around it, and answers to its name in the chat', () => {
    for (const cutIn of made()) {
      expect(cutIn.frameless).toBe(true);
      expect(cutIn.chatActivate).toBe(true);
      expect(cutIn.name.length).toBeGreaterThan(0);
    }
  });

  it('finishes inside the length it was given', () => {
    for (const cutIn of made()) {
      const scene = cutIn.scene!;
      expect(sceneDurationOf(scene)).toBe(scene.durationMs);
    }
  });

  it('leaves nothing behind when the scene ends', () => {
    for (const cutIn of made()) {
      const scene = cutIn.scene!;
      for (const layer of scene.layers) {
        const frames = toWebAnimationFrames(layer, sceneDurationOf(scene));

        expect(frames.length).toBeGreaterThan(1);
        expect(frames[frames.length - 1].opacity).toBe(0);
      }
    }
  });

  it('wipes the band open rather than fading it in', () => {
    const [flash] = made();
    const band = flash.scene!.layers.find((layer) => layer.name === '帯の縁')!;

    expect(band.trackSet.scaleX?.[0].v).toBeLessThan(0.1);
    expect(band.trackSet.opacity?.[0].v).toBe(1);
  });

  it('stamps the word at the end of the band, leaning', () => {
    const [flash] = made();
    const word = flash.scene!.layers.find((layer) => layer.kind === 'text')!;

    expect(word.x).toBeGreaterThan(flash.width / 2);
    expect(word.textAlign).toBe('right');
    expect(word.rotation).toBeLessThan(0);
  });

  it('survives being written out and read back', () => {
    const [flash] = made();
    const xml = ObjectSerializer.instance.toXml(flash);
    const names = flash.scene!.layers.map((layer) => layer.name);

    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    const restored = ObjectSerializer.instance.parseXml(xml) as CutIn;

    expect(restored.scene?.layers.map((layer) => layer.name)).toEqual(names);
    expect(restored.scene?.layers.find((layer) => layer.kind === 'image')?.imageIdentifier).toBe(
      SAMPLE_PORTRAIT_IDENTIFIER
    );
  });
});
