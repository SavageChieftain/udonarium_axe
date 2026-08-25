import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { encodeCutInTracks } from '@axe/domain/media/cut-in-keyframe';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import {
  easingAtMoment,
  hasKeyAt,
  keysOf,
  layerKeyTimes,
  moveLayerKeys,
  pastePoseAt,
  poseAt,
  removeLayerKeys,
  restingValue,
  setEasingAtMoment,
  setValueAt,
  toggleKeyAt,
  valueAt,
} from '@axe/features/media/cut-in-editor/cut-in-keyframe-edit';

describe('cut-in keyframe editing', () => {
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

  function makeLayer(): CutInLayer {
    const layer = new CutInLayer();
    layer.initialize();
    layer.x = 100;
    return layer;
  }

  describe('restingValue() and valueAt()', () => {
    it('reads where the layer rests while nothing moves it', () => {
      const layer = makeLayer();

      expect(restingValue(layer, 'x')).toBe(100);
      expect(valueAt(layer, 'x', 500)).toBe(100);
    });

    it('reads the track once one is there', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({
        x: [
          { t: 0, v: 0, e: 'linear' },
          { t: 1000, v: 200 },
        ],
      });

      expect(valueAt(layer, 'x', 500)).toBeCloseTo(100, 5);
      expect(restingValue(layer, 'x')).toBe(100);
    });
  });

  describe('setValueAt()', () => {
    it('moves where the layer rests while nothing moves it', () => {
      const layer = makeLayer();

      setValueAt(layer, 'x', 500, 250);

      expect(layer.x).toBe(250);
      expect(layer.tracks).toBe('');
    });

    it('writes a key where the track is already moving', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({
        x: [
          { t: 0, v: 0 },
          { t: 1000, v: 200 },
        ],
      });

      setValueAt(layer, 'x', 500, 999);

      expect(keysOf(layer, 'x').map((key) => key.t)).toEqual([0, 500, 1000]);
      expect(valueAt(layer, 'x', 500)).toBe(999);
      expect(layer.x).toBe(100);
    });

    it('takes over the key already standing there', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({
        x: [
          { t: 0, v: 0 },
          { t: 1000, v: 200 },
        ],
      });

      setValueAt(layer, 'x', 1000, 42);

      expect(keysOf(layer, 'x')).toHaveLength(2);
      expect(valueAt(layer, 'x', 1000)).toBe(42);
    });
  });

  describe('toggleKeyAt()', () => {
    it('puts the first key down carrying where the layer rests', () => {
      const layer = makeLayer();

      expect(toggleKeyAt(layer, 'x', 400)).toBe(true);
      expect(keysOf(layer, 'x')).toEqual([{ t: 400, v: 100 }]);
    });

    it('puts a key down carrying what the track already shows there', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({
        x: [
          { t: 0, v: 0, e: 'linear' },
          { t: 1000, v: 200 },
        ],
      });

      toggleKeyAt(layer, 'x', 500);

      expect(valueAt(layer, 'x', 500)).toBeCloseTo(100, 5);
      expect(keysOf(layer, 'x')).toHaveLength(3);
    });

    it('takes the key up again', () => {
      const layer = makeLayer();
      toggleKeyAt(layer, 'x', 400);

      expect(toggleKeyAt(layer, 'x', 400)).toBe(false);
      expect(hasKeyAt(layer, 'x', 400)).toBe(false);
    });

    it('leaves nothing behind once the last key is up', () => {
      const layer = makeLayer();
      toggleKeyAt(layer, 'x', 400);
      toggleKeyAt(layer, 'x', 400);

      expect(layer.tracks).toBe('');
    });
  });

  describe('layerKeyTimes()', () => {
    it('gathers every moment across the tracks, once each', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({
        x: [
          { t: 0, v: 0 },
          { t: 500, v: 1 },
        ],
        opacity: [{ t: 500, v: 1 }],
      });

      expect(layerKeyTimes(layer)).toEqual([0, 500]);
    });
  });

  describe('moveLayerKeys()', () => {
    it('slides every key standing at a moment together', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({ x: [{ t: 500, v: 1 }], opacity: [{ t: 500, v: 0.5 }] });

      expect(moveLayerKeys(layer, 500, 900)).toBe(true);
      expect(layerKeyTimes(layer)).toEqual([900]);
      expect(valueAt(layer, 'opacity', 900)).toBe(0.5);
    });

    it('leaves the layer alone where no key stands', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({ x: [{ t: 500, v: 1 }] });

      expect(moveLayerKeys(layer, 100, 900)).toBe(false);
      expect(layerKeyTimes(layer)).toEqual([500]);
    });
  });

  describe('removeLayerKeys()', () => {
    it('takes away every key standing at a moment', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({
        x: [
          { t: 0, v: 0 },
          { t: 500, v: 1 },
        ],
        opacity: [{ t: 500, v: 1 }],
      });

      expect(removeLayerKeys(layer, 500)).toBe(true);
      expect(layerKeyTimes(layer)).toEqual([0]);
    });

    it('leaves the layer alone where no key stands', () => {
      const layer = makeLayer();

      expect(removeLayerKeys(layer, 500)).toBe(false);
    });
  });

  describe('the curve out of a moment', () => {
    it('is nothing where no key stands', () => {
      expect(easingAtMoment(makeLayer(), 500)).toBeNull();
    });

    it('is what the keys standing there agree on', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({
        x: [{ t: 500, v: 1, e: 'linear' }],
        opacity: [{ t: 500, v: 1, e: 'linear' }],
      });

      expect(easingAtMoment(layer, 500)).toBe('linear');
    });

    it('is nothing where they disagree', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({
        x: [{ t: 500, v: 1, e: 'linear' }],
        opacity: [{ t: 500, v: 1, e: 'outBack' }],
      });

      expect(easingAtMoment(layer, 500)).toBeNull();
    });

    it('is written to every key standing there at once', () => {
      const layer = makeLayer();
      layer.tracks = encodeCutInTracks({ x: [{ t: 500, v: 1 }], opacity: [{ t: 500, v: 1 }] });

      expect(setEasingAtMoment(layer, 500, 'linear')).toBe(true);
      expect(easingAtMoment(layer, 500)).toBe('linear');
    });

    it('writes nothing where no key stands', () => {
      expect(setEasingAtMoment(makeLayer(), 500, 'linear')).toBe(false);
    });
  });
});

describe('copying a moment and laying it down again', () => {
  function layerWith(tracks: Record<string, { t: number; v: number }[]>): CutInLayer {
    const layer = new CutInLayer();
    layer.initialize();
    layer.tracks = encodeCutInTracks(tracks as never);
    return layer;
  }

  it('takes every value the layer holds at that moment', () => {
    const layer = layerWith({
      x: [
        { t: 0, v: 10 },
        { t: 1000, v: 110 },
      ],
    });

    const pose = poseAt(layer, 500);

    // Whatever the layer is doing there, easing and all, rather than a number worked out again.
    expect(pose.values.x).toBe(valueAt(layer, 'x', 500));
    expect(pose.values.x).toBeGreaterThan(10);
    expect(pose.values.x).toBeLessThan(110);
    // What is not keyed is taken as it rests, which is what the layer is doing there.
    expect(pose.values.opacity).toBe(layer.opacity);
  });

  it('lays it down again as keys at another moment', () => {
    const layer = layerWith({
      x: [
        { t: 0, v: 10 },
        { t: 1000, v: 110 },
      ],
    });
    const pose = poseAt(layer, 500);

    expect(pastePoseAt(layer, pose, 1500)).toBe(true);
    expect(valueAt(layer, 'x', 1500)).toBeCloseTo(pose.values.x, 5);
  });

  it('carries a moment from one layer to another', () => {
    const from = layerWith({
      rotation: [
        { t: 0, v: 0 },
        { t: 800, v: 90 },
      ],
    });
    const onto = layerWith({ rotation: [{ t: 0, v: 0 }] });

    pastePoseAt(onto, poseAt(from, 800), 400);

    expect(valueAt(onto, 'rotation', 400)).toBeCloseTo(90, 5);
  });

  it('writes only what the layer it came from was moving', () => {
    const from = layerWith({ x: [{ t: 0, v: 50 }] });
    const onto = layerWith({ opacity: [{ t: 0, v: 1 }] });

    pastePoseAt(onto, poseAt(from, 0), 500);

    expect(keysOf(onto, 'x')).toHaveLength(1);
    // Nine properties are not pinned down for the sake of the one that was moving.
    expect(keysOf(onto, 'opacity')).toHaveLength(1);
    expect(keysOf(onto, 'rotation')).toHaveLength(0);
  });

  it('has nothing to lay down from a layer that moves at nothing', () => {
    const from = layerWith({});
    const onto = layerWith({ x: [{ t: 0, v: 0 }] });

    expect(pastePoseAt(onto, poseAt(from, 0), 300)).toBe(false);
    expect(keysOf(onto, 'x')).toHaveLength(1);
  });

  it('starts a track off where the layer taken onto had none', () => {
    const from = layerWith({ rotation: [{ t: 0, v: 45 }] });
    const onto = layerWith({});

    expect(pastePoseAt(onto, poseAt(from, 0), 300)).toBe(true);
    expect(keysOf(onto, 'rotation')).toHaveLength(1);
  });
});
