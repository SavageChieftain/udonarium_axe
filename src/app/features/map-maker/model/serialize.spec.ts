import { GridType } from '@axe/domain/tabletop/game-table';
import { createScene, ImageLayer, MAP_SCENE_VERSION, MapScene } from '@axe/features/map-maker/model/scene';
import { deserializeScene, isMapScene, serializeScene } from '@axe/features/map-maker/model/serialize';

function makeScene(): MapScene {
  return createScene(10, 8, 64);
}

describe('serializeScene', () => {
  it('produces valid JSON with correct version', () => {
    const scene = makeScene();
    const json = serializeScene(scene);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed['version']).toBe(MAP_SCENE_VERSION);
    expect(parsed['cols']).toBe(10);
    expect(parsed['rows']).toBe(8);
  });

  it('forces version to MAP_SCENE_VERSION even if scene has different version', () => {
    const scene = makeScene();
    (scene as unknown as Record<string, unknown>)['version'] = 999;
    const json = serializeScene(scene);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed['version']).toBe(MAP_SCENE_VERSION);
  });
});

describe('isMapScene', () => {
  it('returns true for valid scene', () => {
    expect(isMapScene(makeScene())).toBe(true);
  });

  it('returns false for null', () => {
    expect(isMapScene(null)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isMapScene('string')).toBe(false);
    expect(isMapScene(42)).toBe(false);
  });

  it('returns false when cols is zero', () => {
    const s = { ...makeScene(), cols: 0 };
    expect(isMapScene(s)).toBe(false);
  });

  it('returns false when rows is negative', () => {
    const s = { ...makeScene(), rows: -1 };
    expect(isMapScene(s)).toBe(false);
  });

  it('returns false when cellPx is missing', () => {
    const s = { ...makeScene() } as Record<string, unknown>;
    delete s['cellPx'];
    expect(isMapScene(s)).toBe(false);
  });

  it('returns false when layers is not an array', () => {
    const s = { ...makeScene(), layers: 'bad' };
    expect(isMapScene(s)).toBe(false);
  });

  it('returns false when a layer has an unknown kind', () => {
    const scene = makeScene() as unknown as Record<string, unknown>;
    scene['layers'] = [{ id: 'x', kind: 'unknown', name: 'test' }];
    expect(isMapScene(scene)).toBe(false);
  });

  it('returns false when version is Infinity', () => {
    const s = { ...makeScene(), version: Infinity };
    expect(isMapScene(s)).toBe(false);
  });
});

describe('deserializeScene round-trip', () => {
  it('deserializes a serialized scene correctly', () => {
    const scene = makeScene();
    const json = serializeScene(scene);
    const result = deserializeScene(json);
    expect(result).not.toBeNull();
    expect(result!.cols).toBe(scene.cols);
    expect(result!.rows).toBe(scene.rows);
    expect(result!.cellPx).toBe(scene.cellPx);
    expect(result!.version).toBe(MAP_SCENE_VERSION);
    expect(result!.layers).toHaveLength(0);
  });

  it('returns null for malformed JSON', () => {
    expect(deserializeScene('not json')).toBeNull();
    expect(deserializeScene('{bad}')).toBeNull();
  });

  it('returns null for valid JSON that fails isMapScene', () => {
    expect(deserializeScene(JSON.stringify({ foo: 'bar' }))).toBeNull();
    expect(deserializeScene(JSON.stringify({ version: 1, cols: 0, rows: 5, cellPx: 64, layers: [] }))).toBeNull();
  });

  it('sanitizes opacity clamping', () => {
    const scene = makeScene();
    scene.layers = [
      {
        id: 'l1',
        kind: 'cell',
        name: 'test',
        visible: true,
        locked: false,
        opacity: 1.5,
        cells: {},
      },
    ];
    const json = JSON.stringify(scene);
    const result = deserializeScene(json);
    expect(result!.layers[0].opacity).toBe(1);

    scene.layers[0].opacity = -0.5;
    const json2 = JSON.stringify(scene);
    const result2 = deserializeScene(json2);
    expect(result2!.layers[0].opacity).toBe(0);
  });

  it('coerces visible/locked booleans', () => {
    const scene = makeScene();
    scene.layers = [
      {
        id: 'l1',
        kind: 'cell',
        name: 'test',
        visible: false,
        locked: false,
        opacity: 1,
        cells: {},
      },
    ];
    const raw = JSON.parse(JSON.stringify(scene)) as Record<string, unknown>;
    const layers = raw['layers'] as Array<Record<string, unknown>>;
    layers[0]['visible'] = false;
    layers[0]['locked'] = true;
    const result = deserializeScene(JSON.stringify(raw));
    expect(result!.layers[0].visible).toBe(false);
    expect(result!.layers[0].locked).toBe(true);
  });

  it('ensures missing arrays default to empty', () => {
    const raw = {
      version: MAP_SCENE_VERSION,
      cols: 5,
      rows: 5,
      cellPx: 64,
      background: '#fff',
      gridColor: '#000',
      gridVisible: true,
      layers: [{ id: 'l1', kind: 'shape', name: 'shapes', visible: true, locked: false, opacity: 1 }],
    };
    const result = deserializeScene(JSON.stringify(raw));
    expect(result).not.toBeNull();
    if (result!.layers[0].kind === 'shape') {
      expect(result!.layers[0].items).toEqual([]);
    }
  });

  it('round-trips gridType', () => {
    for (const gridType of [GridType.NONE, GridType.SQUARE, GridType.HEX_VERTICAL, GridType.HEX_HORIZONTAL]) {
      const scene = createScene(5, 5, 64, gridType);
      const result = deserializeScene(serializeScene(scene));
      expect(result!.gridType).toBe(gridType);
    }
  });

  it('falls back to SQUARE for invalid or missing gridType', () => {
    const base = createScene(5, 5, 64);
    const missing = JSON.parse(serializeScene(base)) as Record<string, unknown>;
    delete missing['gridType'];
    expect(deserializeScene(JSON.stringify(missing))!.gridType).toBe(GridType.SQUARE);

    const bad = { ...missing, gridType: 99 };
    expect(deserializeScene(JSON.stringify(bad))!.gridType).toBe(GridType.SQUARE);

    const wrongType = { ...missing, gridType: 'hex' };
    expect(deserializeScene(JSON.stringify(wrongType))!.gridType).toBe(GridType.SQUARE);
  });

  it('round-trips an image layer', () => {
    const scene = createScene(5, 5, 64);
    const layer: ImageLayer = {
      id: 'img',
      kind: 'image',
      name: 'images',
      visible: true,
      locked: false,
      opacity: 1,
      items: [{ id: 'i1', imageIdentifier: 'abc', x: 1, y: 2, w: 30, h: 40, rotation: 15, opacity: 0.5 }],
    };
    scene.layers = [layer];
    const result = deserializeScene(serializeScene(scene));
    expect(result!.layers).toHaveLength(1);
    const out = result!.layers[0];
    expect(out.kind).toBe('image');
    if (out.kind === 'image') {
      expect(out.items).toHaveLength(1);
      expect(out.items[0]).toMatchObject({ imageIdentifier: 'abc', w: 30, h: 40, rotation: 15, opacity: 0.5 });
    }
  });

  it('defaults missing image items array to empty', () => {
    const raw = {
      version: MAP_SCENE_VERSION,
      cols: 5,
      rows: 5,
      cellPx: 64,
      gridType: GridType.SQUARE,
      background: '#fff',
      gridColor: '#000',
      gridVisible: true,
      layers: [{ id: 'l1', kind: 'image', name: 'images', visible: true, locked: false, opacity: 1 }],
    };
    const result = deserializeScene(JSON.stringify(raw));
    expect(result).not.toBeNull();
    if (result!.layers[0].kind === 'image') {
      expect(result!.layers[0].items).toEqual([]);
    }
  });

  it('drops unknown layer kinds', () => {
    const raw = {
      version: MAP_SCENE_VERSION,
      cols: 5,
      rows: 5,
      cellPx: 64,
      background: '#fff',
      gridColor: '#000',
      gridVisible: true,
      layers: [
        { id: 'l1', kind: 'unknown_type', name: 'bad', visible: true, locked: false, opacity: 1 },
        { id: 'l2', kind: 'cell', name: 'good', visible: true, locked: false, opacity: 1, cells: {} },
      ],
    };
    const result = deserializeScene(JSON.stringify(raw));
    expect(result).not.toBeNull();
    expect(result!.layers).toHaveLength(1);
    expect(result!.layers[0].id).toBe('l2');
  });
});
