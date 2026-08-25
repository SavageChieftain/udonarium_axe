import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { applyLayerPreset, CUT_IN_LAYER_PRESETS, cutInLayerPreset } from '@axe/domain/media/cut-in-layer-presets';

describe('the whole looks a layer may be given', () => {
  let store: ObjectStore;
  const stage = { width: 640, height: 360 };

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
    return layer;
  }

  it('names each look once', () => {
    const ids = CUT_IN_LAYER_PRESETS.map((preset) => preset.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('finds a look by name', () => {
    expect(cutInLayerPreset('impact')?.effect).toBe('shake');
  });

  it('finds nothing for a name it does not know', () => {
    expect(cutInLayerPreset('nonsense')).toBeNull();
  });

  it('writes the arrival, the departure and the touch together', () => {
    const layer = makeLayer();

    expect(applyLayerPreset(layer, 'impact', stage, 3000)).toBe(true);
    expect(layer.effect).toBe('shake');
    expect(layer.effectStrength).toBeGreaterThan(1);
    expect(layer.trackSet.scaleX?.length).toBeGreaterThan(1);
    expect(layer.trackSet.opacity?.length).toBeGreaterThan(1);
  });

  it('leaves the layer alone for a name it does not know', () => {
    const layer = makeLayer();

    expect(applyLayerPreset(layer, 'nonsense', stage, 3000)).toBe(false);
    expect(layer.tracks).toBe('');
    expect(layer.effect).toBe('none');
  });

  it('has something to write for every look it offers', () => {
    for (const preset of CUT_IN_LAYER_PRESETS) {
      const layer = makeLayer();

      expect(applyLayerPreset(layer, preset.id, stage, 3000)).toBe(true);
      expect(layer.tracks.length).toBeGreaterThan(0);
    }
  });

  it('ends every departure with the scene', () => {
    for (const preset of CUT_IN_LAYER_PRESETS) {
      const layer = makeLayer();
      applyLayerPreset(layer, preset.id, stage, 3000);

      const last = Math.max(...Object.values(layer.trackSet).flatMap((keys) => (keys ?? []).map((key) => key.t)));
      expect(last).toBe(3000);
    }
  });
});
