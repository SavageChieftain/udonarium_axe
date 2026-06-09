import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { FilterType, GameTable, GridType } from '@axe/domain/tabletop/game-table';

describe('GameTable', () => {
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

  describe('GridType enum', () => {
    it('NONE = -1', () => {
      expect(GridType.NONE).toBe(-1);
    });

    it('SQUARE = 0', () => {
      expect(GridType.SQUARE).toBe(0);
    });

    it('HEX_VERTICAL = 1', () => {
      expect(GridType.HEX_VERTICAL).toBe(1);
    });

    it('HEX_HORIZONTAL = 2', () => {
      expect(GridType.HEX_HORIZONTAL).toBe(2);
    });
  });

  describe('FilterType enum', () => {
    it('NONE = ""', () => {
      expect(FilterType.NONE).toBe('');
    });

    it('WHITE = "white"', () => {
      expect(FilterType.WHITE).toBe('white');
    });

    it('BLACK = "black"', () => {
      expect(FilterType.BLACK).toBe('black');
    });
  });

  describe('インスタンス生成', () => {
    it('GameTableを生成してObjectStoreに追加する', () => {
      const table = new GameTable();
      table.initialize();
      expect(store.get(table.identifier)).toBe(table);
    });

    it('aliasNameが"game-table"を返す', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.aliasName).toBe('game-table');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('name がデフォルト "テーブル"', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.name).toBe('テーブル');
    });

    it('width がデフォルト 20', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.width).toBe(20);
    });

    it('height がデフォルト 20', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.height).toBe(20);
    });

    it('gridSize がデフォルト 50', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.gridSize).toBe(50);
    });

    it('selected がデフォルト false', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.selected).toBe(false);
    });

    it('gridType がデフォルト SQUARE', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.gridType).toBe(GridType.SQUARE);
    });

    it('backgroundFilterType がデフォルト NONE', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.backgroundFilterType).toBe(FilterType.NONE);
    });

    it('gridColor がデフォルト "#000000e6"', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.gridColor).toBe('#000000e6');
    });

    it('gridFontColor がデフォルト "#000000e6"', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.gridFontColor).toBe('#000000e6');
    });

    it('gridShow がデフォルト false', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.gridShow).toBe(false);
    });

    it('gridSnap がデフォルト true', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.gridSnap).toBe(true);
    });

    it('wallHeight がデフォルト 10', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.wallHeight).toBe(10);
    });

    it('北/東/南/西 の壁表示フラグがすべてデフォルト false', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.showNorthWall).toBe(false);
      expect(table.showEastWall).toBe(false);
      expect(table.showSouthWall).toBe(false);
      expect(table.showWestWall).toBe(false);
    });

    it('暗闇（ステージ効果）はデフォルト無効', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.darknessEnabled).toBe(false);
      expect(table.darknessLevel).toBeGreaterThan(0);
      expect(table.globalIllumination).toBe(0);
      expect(table.ambientColor).toBeTruthy();
    });
  });

  describe('プロパティ変更', () => {
    it('nameを変更できる', () => {
      const table = new GameTable();
      table.initialize();
      table.name = 'バトルマップ';
      expect(table.name).toBe('バトルマップ');
    });

    it('widthを変更できる', () => {
      const table = new GameTable();
      table.initialize();
      table.width = 30;
      expect(table.width).toBe(30);
    });

    it('gridTypeを変更できる', () => {
      const table = new GameTable();
      table.initialize();
      table.gridType = GridType.HEX_VERTICAL;
      expect(table.gridType).toBe(GridType.HEX_VERTICAL);
    });
  });

  describe('terrains / masks / scratchMasks', () => {
    it('初期状態でterrainsが空配列', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.terrains).toEqual([]);
    });

    it('初期状態でmasksが空配列', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.masks).toEqual([]);
    });

    it('初期状態でscratchMasksが空配列', () => {
      const table = new GameTable();
      table.initialize();
      expect(table.scratchMasks).toEqual([]);
    });
  });
});
