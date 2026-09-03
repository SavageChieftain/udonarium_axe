import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { encodeCutInTracks } from '@axe/domain/media/cut-in-keyframe';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { CutInScene, DEFAULT_SCENE_MS, MAX_SCENE_MS, MIN_SCENE_MS } from '@axe/domain/media/cut-in-scene';

describe('CutInScene', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
  });

  function makeScene(cutInIdentifier = 'cut-1'): CutInScene {
    const scene = new CutInScene();
    scene.initialize();
    scene.cutInIdentifier = cutInIdentifier;
    return scene;
  }

  function addLayer(scene: CutInScene): CutInLayer {
    const layer = new CutInLayer();
    layer.initialize();
    scene.appendChild(layer);
    return layer;
  }

  describe('the defaults of the synchronised fields', () => {
    it('belongs to nothing until it is told', () => {
      const scene = new CutInScene();
      scene.initialize();

      expect(scene.cutInIdentifier).toBe('');
    });

    it('starts at the default length, running once, over nothing', () => {
      const scene = makeScene();

      expect(scene.durationMs).toBe(DEFAULT_SCENE_MS);
      expect(scene.sceneLoop).toBe(false);
      expect(scene.backgroundColor).toBe('');
    });

    it('starts empty', () => {
      expect(makeScene().layers).toEqual([]);
    });
  });

  describe('layers', () => {
    it('gathers the layers laid into it', () => {
      const scene = makeScene();
      const first = addLayer(scene);
      const second = addLayer(scene);

      expect(scene.layers).toEqual([first, second]);
    });

    it('keeps them in the order they are to be drawn', () => {
      const scene = makeScene();
      const first = addLayer(scene);
      const second = addLayer(scene);
      scene.insertBefore(second, first);

      expect(scene.layers).toEqual([second, first]);
    });

    it('leaves out a child that is not a layer', () => {
      const scene = makeScene();
      const layer = addLayer(scene);
      scene.appendChild(makeScene('cut-2'));

      expect(scene.layers).toEqual([layer]);
    });
  });

  describe('runningMs', () => {
    it('is as long as it was told', () => {
      const scene = makeScene();
      scene.durationMs = 2000;

      expect(scene.runningMs).toBe(2000);
    });

    it('never runs shorter than the layer that finishes last', () => {
      const scene = makeScene();
      scene.durationMs = 1000;
      addLayer(scene).tracks = encodeCutInTracks({ opacity: [{ t: 4200, v: 0 }] });

      expect(scene.runningMs).toBe(4200);
    });

    it('stays inside what a scene may last', () => {
      const scene = makeScene();

      scene.durationMs = 1;
      expect(scene.runningMs).toBe(MIN_SCENE_MS);

      scene.durationMs = MAX_SCENE_MS * 10;
      expect(scene.runningMs).toBe(MAX_SCENE_MS);
    });

    it('falls back on a length that means nothing', () => {
      const scene = makeScene();
      (scene as unknown as { durationMs: unknown }).durationMs = 'soon';

      expect(scene.runningMs).toBe(DEFAULT_SCENE_MS);
    });
  });

  describe('of()', () => {
    it('finds the scene belonging to a cut-in', () => {
      const scene = makeScene('cut-7');

      expect(CutInScene.of('cut-7')).toBe(scene);
    });

    it('finds nothing for a cut-in that has none', () => {
      makeScene('cut-7');

      expect(CutInScene.of('cut-8')).toBeNull();
    });

    it('finds nothing for no cut-in at all', () => {
      expect(CutInScene.of('')).toBeNull();
    });
  });

  it('takes its layers with it when it goes', () => {
    const scene = makeScene();
    const layer = addLayer(scene);

    scene.destroy();

    expect(store.get(layer.identifier)).toBeNull();
  });
});
