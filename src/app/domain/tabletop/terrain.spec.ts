import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { SlopeDirection, Terrain, TerrainViewState } from '@axe/domain/tabletop/terrain';

describe('Terrain', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.clearAllMocks();
  });

  describe('TerrainViewState enum', () => {
    it('NULL = 0', () => {
      expect(TerrainViewState.NULL).toBe(0);
    });

    it('FLOOR = 1', () => {
      expect(TerrainViewState.FLOOR).toBe(1);
    });

    it('WALL = 2', () => {
      expect(TerrainViewState.WALL).toBe(2);
    });

    it('ALL = 3', () => {
      expect(TerrainViewState.ALL).toBe(3);
    });
  });

  describe('SlopeDirection enum', () => {
    it('NONE = 0', () => {
      expect(SlopeDirection.NONE).toBe(0);
    });

    it('TOP = 1', () => {
      expect(SlopeDirection.TOP).toBe(1);
    });

    it('BOTTOM = 2', () => {
      expect(SlopeDirection.BOTTOM).toBe(2);
    });

    it('LEFT = 3', () => {
      expect(SlopeDirection.LEFT).toBe(3);
    });

    it('RIGHT = 4', () => {
      expect(SlopeDirection.RIGHT).toBe(4);
    });
  });

  describe('create()', () => {
    it('名前を正しく設定する', () => {
      const terrain = Terrain.create('山岳', 2, 3, 1, 'wall.png', 'floor.png');
      expect(terrain.name).toBe('山岳');
    });

    it('幅、奥行き、高さを設定する', () => {
      const terrain = Terrain.create('平原', 3, 4, 2, '', '');
      expect(terrain.width).toBe(3);
      expect(terrain.depth).toBe(4);
      expect(terrain.height).toBe(2);
    });

    it('ObjectStoreに追加される', () => {
      const terrain = Terrain.create('森', 1, 1, 1, '', '');
      const found = store.get(terrain.identifier);
      expect(found).toBe(terrain);
    });

    it('カスタム identifier を指定できる', () => {
      const terrain = Terrain.create('川', 2, 2, 0, '', '', 'custom-terrain-id');
      expect(terrain.identifier).toBe('custom-terrain-id');
    });

    it('identifier 未指定で自動生成される', () => {
      const terrain = Terrain.create('道', 1, 1, 0, '', '');
      expect(terrain.identifier).toBeTruthy();
      expect(terrain.identifier.length).toBeGreaterThan(0);
    });

    it('rootDataElement が作成される', () => {
      const terrain = Terrain.create('砂漠', 2, 2, 1, '', '');
      expect(terrain.rootDataElement).toBeTruthy();
    });

    it('commonDataElement が作成される', () => {
      const terrain = Terrain.create('沼', 1, 1, 0, '', '');
      expect(terrain.commonDataElement).toBeTruthy();
    });

    it('imageDataElement が作成される', () => {
      const terrain = Terrain.create('丘', 1, 1, 1, '', '');
      expect(terrain.imageDataElement).toBeTruthy();
    });
  });

  describe('aliasName', () => {
    it('"terrain" を返す', () => {
      const terrain = Terrain.create('test', 1, 1, 1, '', '');
      expect(terrain.aliasName).toBe('terrain');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('isLocked がデフォルト false', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.isLocked).toBe(false);
    });

    it('mode がデフォルト TerrainViewState.ALL', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.mode).toBe(TerrainViewState.ALL);
    });

    it('rotate がデフォルト 0', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.rotate).toBe(0);
    });

    it('isDropShadow がデフォルト true', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.isDropShadow).toBe(true);
    });

    it('isSlope がデフォルト false', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.isSlope).toBe(false);
    });

    it('isSurfaceShading がデフォルト true', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.isSurfaceShading).toBe(true);
    });

    it('slopeDirection がデフォルト NONE', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.slopeDirection).toBe(SlopeDirection.NONE);
    });

    it('isGrid がデフォルト false', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.isGrid).toBe(false);
    });

    it('blocksSight / blocksLight がデフォルト true（既存卓の見た目を維持）', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.blocksSight).toBe(true);
      expect(terrain.blocksLight).toBe(true);
    });

    it('窓硝子は blocksLight=false（光は通すが視界は遮る）に設定できる', () => {
      const terrain = Terrain.create('窓', 1, 1, 1, '', '');
      terrain.blocksLight = false;
      expect(terrain.blocksSight).toBe(true);
      expect(terrain.blocksLight).toBe(false);
    });

    it('発光はデフォルト無効、lightSpec を組み立てられる', () => {
      const terrain = Terrain.create('結晶', 1, 1, 1, '', '');
      expect(terrain.lightEnabled).toBe(false);
      terrain.lightEnabled = true;
      terrain.lightBrightRadius = 3;
      terrain.lightDimRadius = 6;
      const spec = terrain.lightSpec;
      expect(spec.enabled).toBe(true);
      expect(spec.brightRadius).toBe(3);
      expect(spec.dimRadius).toBe(6);
      expect(spec.ignoreOcclusion).toBe(false);
    });

    it('指向性光の向きは地形の回転(rotate)に追従し lightDirection を加算する', () => {
      const terrain = Terrain.create('灯台', 1, 1, 1, '', '');
      terrain.rotate = 90;
      terrain.lightDirection = 15;
      expect(terrain.lightSpec.direction).toBe(105);
      terrain.rotate = 200;
      expect(terrain.lightSpec.direction).toBe(215);
    });
  });

  describe('dimensions getter/setter', () => {
    it('width を変更できる', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      terrain.width = 5;
      expect(terrain.width).toBe(5);
    });

    it('height を変更できる', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      terrain.height = 3;
      expect(terrain.height).toBe(3);
    });

    it('depth を変更できる', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      terrain.depth = 7;
      expect(terrain.depth).toBe(7);
    });

    it('name を変更できる', () => {
      const terrain = Terrain.create('初期名', 1, 1, 1, '', '');
      terrain.name = '変更後';
      expect(terrain.name).toBe('変更後');
    });
  });

  describe('hasWall / hasFloor (ビット演算)', () => {
    it('mode=ALL → hasWall=true, hasFloor=true', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      terrain.mode = TerrainViewState.ALL;
      expect(terrain.hasWall).toBe(true);
      expect(terrain.hasFloor).toBe(true);
    });

    it('mode=WALL → hasWall=true, hasFloor=false', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      terrain.mode = TerrainViewState.WALL;
      expect(terrain.hasWall).toBe(true);
      expect(terrain.hasFloor).toBe(false);
    });

    it('mode=FLOOR → hasWall=false, hasFloor=true', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      terrain.mode = TerrainViewState.FLOOR;
      expect(terrain.hasWall).toBe(false);
      expect(terrain.hasFloor).toBe(true);
    });

    it('mode=NULL → hasWall=false, hasFloor=false', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      terrain.mode = TerrainViewState.NULL;
      expect(terrain.hasWall).toBe(false);
      expect(terrain.hasFloor).toBe(false);
    });
  });

  describe('TabletopObject 継承', () => {
    it('location のデフォルトが table', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.location.name).toBe('table');
    });

    it('posZ のデフォルトが 0', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.posZ).toBe(0);
    });

    it('isVisibleOnTable が true', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      expect(terrain.isVisibleOnTable).toBe(true);
    });

    it('setLocation で場所を変更できる', () => {
      const terrain = Terrain.create('t', 1, 1, 1, '', '');
      terrain.setLocation('graveyard');
      expect(terrain.location.name).toBe('graveyard');
      expect(terrain.isVisibleOnTable).toBe(false);
    });
  });
});
