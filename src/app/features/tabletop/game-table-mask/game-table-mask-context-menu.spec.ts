import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { buildGameTableMaskContextMenu } from '@axe/features/tabletop/game-table-mask/game-table-mask-context-menu';

interface MutableMask {
  isLock: boolean;
  dispLockMark: boolean;
  isMine: boolean;
  altitude: number;
  isAltitudeIndicate: boolean;
  parent: null;
  clone: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

function makeMask(overrides: Partial<MutableMask> = {}): MutableMask {
  return {
    isLock: false,
    dispLockMark: true,
    isMine: false,
    altitude: 0,
    isAltitudeIndicate: false,
    parent: null,
    clone: vi.fn(() => ({ location: { x: 0, y: 0 }, isLock: false })),
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

function defaultParams(mask: MutableMask) {
  return {
    mask: mask as unknown as GameTableMask,
    gridSize: 50,
    objectPosition: { x: 0, y: 0, z: 0 },
    inventoryService: makeService(),
    tabletopActionService: makeActionService(),
    onStartScratch: vi.fn(),
    onFinishScratch: vi.fn(),
    onCancelScratch: vi.fn(),
    onEdit: vi.fn(),
  };
}

const names = (a: { name: string }[]) => a.map((x) => x.name);

describe('buildGameTableMaskContextMenu()', () => {
  it('先頭に「高度設定」サブメニュー', () => {
    const menu = buildGameTableMaskContextMenu(defaultParams(makeMask()));
    expect(menu[0].name).toBe('高度設定');
    expect(menu[0].subActions?.length).toBe(2);
  });

  it('isLock=false で「固定する」、true で「固定解除」', () => {
    const unlocked = buildGameTableMaskContextMenu(defaultParams(makeMask({ isLock: false })));
    expect(names(unlocked)).toContain('固定する');

    const locked = buildGameTableMaskContextMenu(defaultParams(makeMask({ isLock: true })));
    expect(names(locked)).toContain('固定解除');
  });

  it('isLock=true && dispLockMark=true で「固定マーク消去」が出る', () => {
    const menu = buildGameTableMaskContextMenu(defaultParams(makeMask({ isLock: true, dispLockMark: true })));
    expect(names(menu)).toContain('固定マーク消去');
  });

  it('isLock=true && dispLockMark=false で「固定マーク表示」が出る', () => {
    const menu = buildGameTableMaskContextMenu(defaultParams(makeMask({ isLock: true, dispLockMark: false })));
    expect(names(menu)).toContain('固定マーク表示');
  });

  it('isMine=false で「スクラッチ開始」、isMine=true で「スクラッチ確定」「スクラッチキャンセル」', () => {
    const notMine = buildGameTableMaskContextMenu(defaultParams(makeMask({ isMine: false })));
    expect(names(notMine)).toContain('スクラッチ開始');
    expect(names(notMine)).not.toContain('スクラッチ確定');

    const mine = buildGameTableMaskContextMenu(defaultParams(makeMask({ isMine: true })));
    expect(names(mine)).toContain('スクラッチ確定');
    expect(names(mine)).toContain('スクラッチキャンセル');
  });

  it('「スクラッチ開始」が onStartScratch を呼ぶ', () => {
    const params = defaultParams(makeMask({ isMine: false }));
    const menu = buildGameTableMaskContextMenu(params);
    menu.find((m) => m.name === 'スクラッチ開始')!.action!();
    expect(params.onStartScratch).toHaveBeenCalled();
  });

  it('「マスクを編集」が onEdit(mask) を呼ぶ', () => {
    const mask = makeMask();
    const params = defaultParams(mask);
    const menu = buildGameTableMaskContextMenu(params);
    menu.find((m) => m.name === 'マスクを編集')!.action!();
    expect(params.onEdit).toHaveBeenCalledWith(mask);
  });

  it('「削除する」が mask.destroy() を呼ぶ', () => {
    const mask = makeMask();
    const menu = buildGameTableMaskContextMenu(defaultParams(mask));
    menu.find((m) => m.name === '削除する')!.action!();
    expect(mask.destroy).toHaveBeenCalled();
  });

  it('末尾の「オブジェクト作成」は tabletopActionService.makeDefaultContextMenuActions() の結果をサブメニューに展開する', () => {
    const params = defaultParams(makeMask());
    (params.tabletopActionService.makeDefaultContextMenuActions as ReturnType<typeof vi.fn>).mockReturnValue([
      { name: 'カード作成', action: vi.fn() },
    ]);
    const menu = buildGameTableMaskContextMenu(params);
    const create = menu.find((m) => m.name === 'オブジェクト作成');
    expect(create?.subActions?.length).toBe(1);
    expect(create?.subActions?.[0].name).toBe('カード作成');
  });
});
