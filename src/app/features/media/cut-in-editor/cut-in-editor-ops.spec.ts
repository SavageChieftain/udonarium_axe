import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import {
  addLayer,
  duplicateLayer,
  ensureScene,
  nextCopyName,
  removeLayer,
  reorderLayers,
} from '@axe/features/media/cut-in-editor/cut-in-editor-ops';

describe('cut-in editor operations', () => {
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

  function makeCutIn(): CutIn {
    const cutIn = new CutIn();
    cutIn.initialize();
    return cutIn;
  }

  describe('ensureScene()', () => {
    it('makes one the first time and binds it to the cut-in', () => {
      const cutIn = makeCutIn();

      const scene = ensureScene(cutIn);

      expect(scene.cutInIdentifier).toBe(cutIn.identifier);
      expect(cutIn.scene).toBe(scene);
    });

    it('hands back the one already there', () => {
      const cutIn = makeCutIn();
      const scene = ensureScene(cutIn);

      expect(ensureScene(cutIn)).toBe(scene);
    });
  });

  describe('addLayer()', () => {
    it('lays a picture in the middle of the cut-in', () => {
      const scene = ensureScene(makeCutIn());

      const layer = addLayer(scene, 'image', '立ち絵', stage);

      expect(layer.kind).toBe('image');
      expect(layer.name).toBe('立ち絵');
      expect(layer.x + layer.width / 2).toBe(stage.width / 2);
      expect(layer.y + layer.height / 2).toBe(stage.height / 2);
    });

    it('gives a text layer its name to say', () => {
      const scene = ensureScene(makeCutIn());

      expect(addLayer(scene, 'text', '見出し', stage).text).toBe('見出し');
    });

    it('lays a band across the whole width', () => {
      const scene = ensureScene(makeCutIn());

      expect(addLayer(scene, 'fill', '帯', stage).width).toBe(stage.width);
    });

    it('lays each new layer over the last', () => {
      const scene = ensureScene(makeCutIn());
      const first = addLayer(scene, 'image', '一枚目', stage);
      const second = addLayer(scene, 'image', '二枚目', stage);

      expect(scene.layers).toEqual([first, second]);
    });
  });

  describe('duplicateLayer()', () => {
    it('copies what the layer was told', () => {
      const scene = ensureScene(makeCutIn());
      const layer = addLayer(scene, 'text', '見出し', stage);
      layer.color = '#ff0000';
      layer.rotation = 30;

      const copy = duplicateLayer(scene, layer)!;

      expect(copy).not.toBe(layer);
      expect(copy.color).toBe('#ff0000');
      expect(copy.rotation).toBe(30);
      expect(scene.layers).toHaveLength(2);
    });

    it('counts the copy up past what is taken', () => {
      const scene = ensureScene(makeCutIn());
      const layer = addLayer(scene, 'image', '立ち絵', stage);

      expect(duplicateLayer(scene, layer)?.name).toBe('立ち絵 2');
      expect(duplicateLayer(scene, layer)?.name).toBe('立ち絵 3');
    });

    it('copies nothing that is not in the scene', () => {
      const scene = ensureScene(makeCutIn());
      const stray = new CutInLayer();
      stray.initialize();

      expect(duplicateLayer(scene, stray)).toBeNull();
    });
  });

  describe('removeLayer()', () => {
    it('takes the layer out of the scene and out of the store', () => {
      const scene = ensureScene(makeCutIn());
      const layer = addLayer(scene, 'image', '立ち絵', stage);

      expect(removeLayer(scene, layer)).toBe(true);
      expect(scene.layers).toEqual([]);
      expect(store.get(layer.identifier)).toBeNull();
    });

    it('takes nothing out that is not in the scene', () => {
      const scene = ensureScene(makeCutIn());
      const stray = new CutInLayer();
      stray.initialize();

      expect(removeLayer(scene, stray)).toBe(false);
    });
  });

  describe('reorderLayers()', () => {
    it('moves a layer to where it was dropped', () => {
      const scene = ensureScene(makeCutIn());
      const first = addLayer(scene, 'image', '一', stage);
      const second = addLayer(scene, 'image', '二', stage);
      const third = addLayer(scene, 'image', '三', stage);

      reorderLayers(scene, first, third, 'after');

      expect(scene.layers).toEqual([second, third, first]);
    });

    it('leaves the scene alone where nothing moves', () => {
      const scene = ensureScene(makeCutIn());
      const only = addLayer(scene, 'image', '一', stage);

      expect(reorderLayers(scene, only, only, 'after')).toBeNull();
      expect(scene.layers).toEqual([only]);
    });
  });
});

describe('nextCopyName()', () => {
  it('counts up from two', () => {
    expect(nextCopyName(['立ち絵'], '立ち絵')).toBe('立ち絵 2');
  });

  it('skips past what is taken', () => {
    expect(nextCopyName(['立ち絵', '立ち絵 2', '立ち絵 3'], '立ち絵')).toBe('立ち絵 4');
  });

  it('counts on from a name that already ends in a number', () => {
    expect(nextCopyName(['立ち絵', '立ち絵 2'], '立ち絵 2')).toBe('立ち絵 3');
  });

  it('has something to call a layer with no name', () => {
    expect(nextCopyName([], '')).toBe(' 2');
  });
});
