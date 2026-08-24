import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { type CutInTrackSet, encodeCutInTracks } from '@axe/domain/media/cut-in-keyframe';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { CutInScene } from '@axe/domain/media/cut-in-scene';
import {
  layerFilter,
  layerOrigin,
  layerTransform,
  layerWindow,
  sampleLayerAt,
  sceneDurationOf,
  toWebAnimationFrames,
} from '@axe/domain/media/cut-in-scene-timeline';

describe('cut-in scene timeline', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  function makeLayer(tracks: CutInTrackSet = {}, fields: Partial<CutInLayer> = {}): CutInLayer {
    const layer = new CutInLayer();
    layer.initialize();
    Object.assign(layer, fields);
    layer.tracks = encodeCutInTracks(tracks);
    return layer;
  }

  describe('layerWindow()', () => {
    it('runs the whole scene by default', () => {
      expect(layerWindow(makeLayer(), 3000)).toEqual({ startMs: 0, endMs: 3000 });
    });

    it('holds what it is told inside the scene', () => {
      expect(layerWindow(makeLayer({}, { startMs: 500, endMs: 9000 }), 3000)).toEqual({ startMs: 500, endMs: 3000 });
    });

    it('never ends before it starts', () => {
      expect(layerWindow(makeLayer({}, { startMs: 2000, endMs: 500 }), 3000)).toEqual({ startMs: 2000, endMs: 2000 });
    });
  });

  describe('sampleLayerAt()', () => {
    it('rests where the layer was put', () => {
      const sample = sampleLayerAt(makeLayer({}, { x: 40, y: 20, rotation: 15 }), 0, 1000);

      expect(sample.x).toBe(40);
      expect(sample.y).toBe(20);
      expect(sample.rotation).toBe(15);
      expect(sample.scaleX).toBe(1);
      expect(sample.opacity).toBe(1);
    });

    it('lets a track override where it rests', () => {
      const layer = makeLayer(
        {
          x: [
            { t: 0, v: -400, e: 'linear' },
            { t: 1000, v: 0 },
          ],
        },
        { x: 40 }
      );

      expect(sampleLayerAt(layer, 0, 1000).x).toBe(-400);
      expect(sampleLayerAt(layer, 500, 1000).x).toBeCloseTo(-200, 5);
      expect(sampleLayerAt(layer, 1000, 1000).x).toBe(0);
    });

    it('is out of sight before it comes on and after it goes off', () => {
      const layer = makeLayer({}, { startMs: 400, endMs: 900 });

      expect(sampleLayerAt(layer, 200, 2000).visible).toBe(false);
      expect(sampleLayerAt(layer, 400, 2000).visible).toBe(true);
      expect(sampleLayerAt(layer, 899, 2000).visible).toBe(true);
      expect(sampleLayerAt(layer, 900, 2000).visible).toBe(false);
    });

    it('stays to the last moment of a layer that never goes off', () => {
      expect(sampleLayerAt(makeLayer(), 2000, 2000).visible).toBe(true);
    });
  });

  describe('what the styles come out as', () => {
    it('writes the move, the turn and the growth in one transform', () => {
      const sample = sampleLayerAt(makeLayer({}, { x: 10, y: -5, rotation: 30, scaleX: 2, scaleY: 0.5 }), 0, 1000);

      expect(layerTransform(sample)).toBe('translate(10px, -5px) rotate(30deg) scale(2, 0.5)');
    });

    it('writes no filter for a layer that is not blurred', () => {
      expect(layerFilter(sampleLayerAt(makeLayer(), 0, 1000))).toBe('none');
    });

    it('writes the blur for one that is', () => {
      expect(layerFilter(sampleLayerAt(makeLayer({}, { blur: 4 }), 0, 1000))).toBe('blur(4px)');
    });

    it('writes the anchor as the origin of the transform', () => {
      expect(layerOrigin(makeLayer())).toBe('50% 50%');
      expect(layerOrigin(makeLayer({}, { anchorX: 0, anchorY: 1 }))).toBe('0% 100%');
    });
  });

  describe('toWebAnimationFrames()', () => {
    it('runs from the start of the scene to the end of it', () => {
      const frames = toWebAnimationFrames(makeLayer(), 2000);

      expect(frames[0].offset).toBe(0);
      expect(frames[frames.length - 1].offset).toBe(1);
    });

    it('never steps backwards', () => {
      const frames = toWebAnimationFrames(
        makeLayer({
          x: [
            { t: 0, v: 0 },
            { t: 700, v: 200 },
          ],
          opacity: [
            { t: 300, v: 0 },
            { t: 900, v: 1 },
          ],
        }),
        2000
      );

      for (let at = 1; at < frames.length; at++) {
        expect(frames[at].offset).toBeGreaterThanOrEqual(frames[at - 1].offset);
      }
    });

    it('leaves the last frame without a curve out of it', () => {
      const frames = toWebAnimationFrames(makeLayer(), 2000);

      expect(frames[frames.length - 1].easing).toBeUndefined();
      expect(frames[0].easing).toBeTruthy();
    });

    it('fills in every property at each moment, whichever track asked for it', () => {
      const frames = toWebAnimationFrames(
        makeLayer({
          x: [
            { t: 0, v: 0, e: 'linear' },
            { t: 1000, v: 100 },
          ],
          opacity: [{ t: 500, v: 0.25, e: 'linear' }],
        }),
        1000
      );

      const halfway = frames.find((frame) => frame.offset === 0.5);
      expect(halfway).toBeDefined();
      expect(halfway?.opacity).toBeCloseTo(0.25, 5);
      expect(halfway?.transform).toContain('translate(50px');
    });

    it('hands a stretch over as the curve it was drawn with, where the tracks agree', () => {
      const frames = toWebAnimationFrames(
        makeLayer({
          x: [
            { t: 0, v: 0, e: 'outBack' },
            { t: 1000, v: 100 },
          ],
        }),
        1000
      );

      expect(frames).toHaveLength(2);
      expect(frames[0].easing).toBe('cubic-bezier(0.175, 0.885, 0.32, 1.275)');
    });

    it('cuts a stretch up where no one curve describes it', () => {
      const frames = toWebAnimationFrames(
        makeLayer({
          x: [
            { t: 0, v: 0, e: 'outBack' },
            { t: 1000, v: 100 },
          ],
          opacity: [
            { t: 400, v: 0, e: 'linear' },
            { t: 1000, v: 1 },
          ],
        }),
        1000
      );

      expect(frames.length).toBeGreaterThan(3);
      expect(frames.every((frame) => frame.easing === undefined || frame.easing === 'cubic-bezier(0, 0, 1, 1)')).toBe(
        true
      );
    });

    it('leaves a straight stretch uncut', () => {
      const frames = toWebAnimationFrames(
        makeLayer({
          x: [
            { t: 0, v: 0, e: 'linear' },
            { t: 1000, v: 100 },
          ],
        }),
        1000
      );

      expect(frames).toHaveLength(2);
    });

    it('brings a layer on and takes it off without fading', () => {
      const frames = toWebAnimationFrames(makeLayer({}, { startMs: 400, endMs: 800 }), 1200);

      const arriving = frames.filter((frame) => frame.offset === 400 / 1200);
      const leaving = frames.filter((frame) => frame.offset === 800 / 1200);

      expect(arriving.map((frame) => frame.opacity)).toEqual([0, 1]);
      expect(leaving.map((frame) => frame.opacity)).toEqual([1, 0]);
    });

    it('keeps a layer that runs the whole scene on to the very end', () => {
      const frames = toWebAnimationFrames(makeLayer(), 1200);

      expect(frames[frames.length - 1].opacity).toBe(1);
    });
  });

  describe('sceneDurationOf()', () => {
    it('is nothing without a scene', () => {
      expect(sceneDurationOf(null)).toBe(0);
      expect(sceneDurationOf(undefined)).toBe(0);
    });

    it('is as long as the scene runs', () => {
      const scene = new CutInScene();
      scene.initialize();
      scene.durationMs = 2500;

      expect(sceneDurationOf(scene)).toBe(2500);
    });
  });

  describe('a layer wearing an effect', () => {
    it('is shifted about by one that moves it', () => {
      const layer = makeLayer({}, { x: 100, effect: 'shake', effectStrength: 1 });

      const early = sampleLayerAt(layer, 100, 2000).x;
      const later = sampleLayerAt(layer, 160, 2000).x;

      expect(early).not.toBe(100);
      expect(early).not.toBe(later);
    });

    it('asks for the light in the colour it was given', () => {
      const layer = makeLayer({}, { effect: 'glow', effectColor: '#ff8800' });

      expect(layerFilter(sampleLayerAt(layer, 0, 2000))).toContain('#ff8800');
    });

    it('keeps whatever blur the layer already had', () => {
      const layer = makeLayer({}, { blur: 3, effect: 'glow' });
      const filter = layerFilter(sampleLayerAt(layer, 0, 2000));

      expect(filter).toContain('blur(3px)');
      expect(filter).toContain('drop-shadow');
    });

    it('is cut up finely enough for the browser to follow', () => {
      const still = toWebAnimationFrames(makeLayer(), 2000);
      const shaking = toWebAnimationFrames(makeLayer({}, { effect: 'shake' }), 2000);

      expect(shaking.length).toBeGreaterThan(still.length);
    });

    it('leaves a layer wearing none exactly as it was', () => {
      const layer = makeLayer({}, { x: 100, effect: 'none' });

      expect(sampleLayerAt(layer, 500, 2000).x).toBe(100);
      expect(layerFilter(sampleLayerAt(layer, 500, 2000))).toBe('none');
    });
  });
});
