import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { SlopeDirection, Terrain, TerrainViewState } from '@axe/domain/tabletop/terrain';
import { buildTerrainContextMenu } from '@axe/features/tabletop/terrain/terrain-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

interface MutableTerrain {
  width: number;
  depth: number;
  altitude: number;
  isAltitudeIndicate: boolean;
  isLocked: boolean;
  isSlope: boolean;
  slopeDirection: SlopeDirection;
  hasWall: boolean;
  isSurfaceShading: boolean;
  isDropShadow: boolean;
  mode: TerrainViewState;
  parent: null;
  clone: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

function makeTerrain(overrides: Partial<MutableTerrain> = {}): MutableTerrain {
  return {
    width: 1,
    depth: 1,
    altitude: 0,
    isAltitudeIndicate: false,
    isLocked: false,
    isSlope: false,
    slopeDirection: SlopeDirection.NONE,
    hasWall: true,
    isSurfaceShading: false,
    isDropShadow: false,
    mode: TerrainViewState.ALL,
    parent: null,
    clone: vi.fn(() => ({ location: { x: 0, y: 0 }, isLocked: false })),
    destroy: vi.fn(),
    ...overrides,
  };
}

function makeService(): GameObjectInventoryService {
  return { notifyInventoryUpdate: vi.fn() } as unknown as GameObjectInventoryService;
}

function makeActionService(): TabletopActionService {
  return { makeDefaultContextMenuActions: vi.fn(() => []) } as unknown as TabletopActionService;
}

const names = (a: { name: string }[]) => a.map((x) => x.name);

describe('buildTerrainContextMenu()', () => {
  it('「高度設定」サブメニューに 3 項目 (0 にする / 高度表示 / 影の表示)', () => {
    const menu = buildTerrainContextMenu(
      makeTerrain() as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    expect(menu[0].name).toBe('高度設定');
    expect(menu[0].subActions?.length).toBe(3);
  });

  it('isLocked=true で「固定解除」、false で「固定する」', () => {
    const lockedMenu = buildTerrainContextMenu(
      makeTerrain({ isLocked: true }) as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    expect(names(lockedMenu)).toContain('固定解除');

    const unlockedMenu = buildTerrainContextMenu(
      makeTerrain({ isLocked: false }) as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    expect(names(unlockedMenu)).toContain('固定する');
  });

  it('傾斜サブメニューの 5 項目 (なし + 4 方向) ＋ separator', () => {
    const menu = buildTerrainContextMenu(
      makeTerrain() as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    const slope = menu.find((m) => m.name === '傾斜');
    expect(slope).toBeDefined();
    expect(slope?.subActions?.length).toBe(6);
  });

  it('傾斜「上（北）」action 実行で isSlope=true, slopeDirection=TOP', () => {
    const terrain = makeTerrain();
    const menu = buildTerrainContextMenu(
      terrain as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    const slope = menu.find((m) => m.name === '傾斜');
    const top = slope?.subActions?.find((s) => s.name.includes('上（北）'));
    top?.action?.();
    expect(terrain.isSlope).toBe(true);
    expect(terrain.slopeDirection).toBe(SlopeDirection.TOP);
  });

  it('hasWall=true で「壁を非表示」、hasWall=false で「壁を表示」', () => {
    const withWall = buildTerrainContextMenu(
      makeTerrain({ hasWall: true }) as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    expect(names(withWall)).toContain('壁を非表示');

    const noWall = buildTerrainContextMenu(
      makeTerrain({ hasWall: false }) as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    expect(names(noWall)).toContain('壁を表示');
  });

  it('isDropShadow フラグで「影を表示」「影を非表示」が切り替わる', () => {
    const noShadow = buildTerrainContextMenu(
      makeTerrain({ isDropShadow: false }) as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    expect(names(noShadow)).toContain('影を表示');

    const withShadow = buildTerrainContextMenu(
      makeTerrain({ isDropShadow: true }) as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    expect(names(withShadow)).toContain('影を非表示');
  });

  it('「地形設定を編集」が onEdit(terrain) を呼ぶ', () => {
    const terrain = makeTerrain();
    const onEdit = vi.fn();
    const menu = buildTerrainContextMenu(
      terrain as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      onEdit,
      t
    );
    menu.find((m) => m.name === '地形設定を編集')!.action!();
    expect(onEdit).toHaveBeenCalledWith(terrain);
  });

  it('「削除する」が terrain.destroy() を呼ぶ', () => {
    const terrain = makeTerrain();
    const menu = buildTerrainContextMenu(
      terrain as unknown as Terrain,
      50,
      { x: 0, y: 0, z: 0 },
      makeService(),
      makeActionService(),
      vi.fn(),
      t
    );
    menu.find((m) => m.name === '削除する')!.action!();
    expect(terrain.destroy).toHaveBeenCalled();
  });
});
