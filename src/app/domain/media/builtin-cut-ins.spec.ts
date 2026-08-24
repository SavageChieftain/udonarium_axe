import { TestBed } from '@angular/core/testing';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import {
  createDefaultCutIns,
  DEFAULT_CUT_IN_SEEDS,
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

  it('registers the face it comes with under one identifier', () => {
    made();
    made();

    expect(imageStorage.get(SAMPLE_PORTRAIT_IDENTIFIER)).not.toBeNull();
    expect(imageStorage.images.filter((image) => image.identifier === SAMPLE_PORTRAIT_IDENTIFIER)).toHaveLength(1);
  });

  it('puts a face in the window of each', () => {
    for (const cutIn of made()) {
      const faces = (cutIn.scene?.layers ?? []).filter((layer) => layer.kind === 'image');

      expect(faces).toHaveLength(1);
      expect(faces[0].imageIdentifier).toBe(SAMPLE_PORTRAIT_IDENTIFIER);
      expect(faces[0].objectFit).toBe('cover');
      expect(faces[0].name).toContain('差し替える');
    }
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

  it('shows the eyes rather than whatever the middle of a picture happens to be', () => {
    const [flash] = made();
    const eyes = flash.scene!.layers.find((layer) => layer.kind === 'image')!;

    expect(eyes.objectFit).toBe('cover');
    expect(eyes.objectPosY).toBeLessThan(50);
  });

  it('tears and leans the newer one', () => {
    const [, tear] = made();
    const frame = tear.scene!.layers.find((layer) => layer.name === '枠')!;

    expect(frame.rotation).toBeLessThan(0);
    expect(frame.skewXDeg).toBeLessThan(0);
    expect(frame.clip).toBe('torn');
  });

  it('lays lines converging on the middle behind both of them', () => {
    for (const cutIn of made()) {
      const rays = cutIn.scene!.layers.find((layer) => layer.fillShape === 'speedlines');

      expect(rays).toBeDefined();
      expect(rays!.width).toBeGreaterThan(cutIn.width * 0.9);
    }
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

  it('slams the leaning window in from off the right', () => {
    const [, tear] = made();
    const frame = tear.scene!.layers.find((layer) => layer.name === '枠')!;

    expect(frame.trackSet.x?.[0].v).toBeGreaterThan(800);
    expect(frame.trackSet.x?.[1].v).toBe(frame.x);
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
