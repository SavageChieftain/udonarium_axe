import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import {
  applyEntrance,
  applyExit,
  CUT_IN_ENTRANCES,
  CUT_IN_EXITS,
  DEFAULT_PRESET_MS,
  isCutInEntrance,
  isCutInExit,
  restOf,
  withEntrance,
  withExit,
} from '@axe/domain/media/cut-in-animation-presets';
import { encodeCutInTracks } from '@axe/domain/media/cut-in-keyframe';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';

const stage = { width: 640, height: 360 };
const rest = { x: 100, y: 50, width: 200, height: 100, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 };

describe('the presets a layer may arrive and leave by', () => {
  it('knows the ones it has', () => {
    expect(isCutInEntrance('slideInLeft')).toBe(true);
    expect(isCutInExit('dropOut')).toBe(true);
  });

  it('turns away anything else', () => {
    expect(isCutInEntrance('slideInLeftish')).toBe(false);
    expect(isCutInExit('slideInLeft')).toBe(false);
  });
});

describe('withEntrance()', () => {
  it('starts out of sight and finishes where the layer rests', () => {
    const tracks = withEntrance({}, 'fadeIn', rest, stage, 0);

    expect(tracks.opacity?.[0]).toMatchObject({ t: 0, v: 0 });
    expect(tracks.opacity?.[1]).toMatchObject({ t: DEFAULT_PRESET_MS, v: 1 });
  });

  it('comes in from off the left edge', () => {
    const tracks = withEntrance({}, 'slideInLeft', rest, stage, 0);

    expect(tracks.x?.[0].v).toBe(-rest.width);
    expect(tracks.x?.[1].v).toBe(rest.x);
  });

  it('comes in from beyond the right edge', () => {
    expect(withEntrance({}, 'slideInRight', rest, stage, 0).x?.[0].v).toBeGreaterThanOrEqual(stage.width);
  });

  it('grows into place', () => {
    const tracks = withEntrance({}, 'zoomIn', rest, stage, 0);

    expect(tracks.scaleX?.[0].v).toBeLessThan(1);
    expect(tracks.scaleX?.[1].v).toBe(1);
    expect(tracks.scaleY?.[1].v).toBe(1);
  });

  it('overshoots on the one that is meant to', () => {
    expect(withEntrance({}, 'popIn', rest, stage, 0).scaleX?.[0].e).toBe('outBack');
  });

  it('turns a half circle on its way in, ending where the layer sits', () => {
    const tracks = withEntrance({}, 'spinIn', rest, stage, 0);

    expect(tracks.rotation?.[0].v).toBe(-180);
    expect(tracks.rotation?.[1].v).toBe(0);
  });

  it('starts where the layer comes on rather than at the top of the scene', () => {
    expect(withEntrance({}, 'fadeIn', rest, stage, 600).opacity?.[0].t).toBe(600);
  });

  it('keeps whatever else the layer was already doing', () => {
    const tracks = withEntrance({ blur: [{ t: 900, v: 4 }] }, 'fadeIn', rest, stage, 0);

    expect(tracks.blur).toEqual([{ t: 900, v: 4 }]);
  });

  it('writes over a key already standing where it lands', () => {
    const tracks = withEntrance({ opacity: [{ t: 0, v: 0.5 }] }, 'fadeIn', rest, stage, 0);

    expect(tracks.opacity).toHaveLength(2);
    expect(tracks.opacity?.[0].v).toBe(0);
  });

  it('has something to lay down for every entrance it offers', () => {
    for (const name of CUT_IN_ENTRANCES) {
      expect(Object.keys(withEntrance({}, name, rest, stage, 0)).length).toBeGreaterThan(0);
    }
  });
});

describe('withExit()', () => {
  it('leaves from where the layer rests and finishes out of sight', () => {
    const tracks = withExit({}, 'fadeOut', rest, stage, 2000);

    expect(tracks.opacity?.[0]).toMatchObject({ t: 2000 - DEFAULT_PRESET_MS, v: 1 });
    expect(tracks.opacity?.[1]).toMatchObject({ t: 2000, v: 0 });
  });

  it('never starts before the scene does', () => {
    expect(withExit({}, 'fadeOut', rest, stage, 100, 600).opacity?.[0].t).toBe(0);
  });

  it('falls away turning', () => {
    const tracks = withExit({}, 'dropOut', rest, stage, 2000);

    expect(tracks.y?.[1].v).toBeGreaterThanOrEqual(stage.height);
    expect(tracks.rotation?.[1].v).toBeGreaterThan(0);
  });

  it('has something to lay down for every exit it offers', () => {
    for (const name of CUT_IN_EXITS) {
      expect(Object.keys(withExit({}, name, rest, stage, 2000)).length).toBeGreaterThan(0);
    }
  });
});

describe('applying a preset to a layer', () => {
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
    layer.y = 50;
    layer.width = 200;
    layer.height = 100;
    return layer;
  }

  it('reads where the layer rests off the layer', () => {
    expect(restOf(makeLayer())).toMatchObject({ x: 100, y: 50, opacity: 1 });
  });

  it('writes the entrance onto the layer', () => {
    const layer = makeLayer();

    applyEntrance(layer, 'slideInLeft', stage);

    expect(layer.trackSet.x).toHaveLength(2);
    expect(layer.trackSet.x?.[1].v).toBe(100);
  });

  it('starts the entrance where the layer comes on', () => {
    const layer = makeLayer();
    layer.startMs = 800;

    applyEntrance(layer, 'fadeIn', stage);

    expect(layer.trackSet.opacity?.[0].t).toBe(800);
  });

  it('ends the exit where the layer goes off', () => {
    const layer = makeLayer();
    layer.endMs = 1500;

    applyExit(layer, 'fadeOut', stage, 3000);

    expect(layer.trackSet.opacity?.[1].t).toBe(1500);
  });

  it('ends the exit with the scene where the layer never goes off', () => {
    const layer = makeLayer();

    applyExit(layer, 'fadeOut', stage, 3000);

    expect(layer.trackSet.opacity?.[1].t).toBe(3000);
  });

  it('leaves an entrance already laid down alone when an exit goes on', () => {
    const layer = makeLayer();
    layer.tracks = encodeCutInTracks({ blur: [{ t: 100, v: 2 }] });

    applyExit(layer, 'zoomOut', stage, 3000);

    expect(layer.trackSet.blur).toEqual([{ t: 100, v: 2 }]);
  });
});
