import { ContextMenuType } from '@axe/application/ui/context-menu.service';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { buildScratchMaskContextMenu } from '@axe/features/tabletop/game-table-scratch-mask/game-table-scratch-mask-context-menu';

function makeMask(): { destroy: ReturnType<typeof vi.fn> } {
  return { destroy: vi.fn() };
}

describe('buildScratchMaskContextMenu()', () => {
  it('isLocked=true で 1 つめが「固定解除」、isLocked=false で「固定する」', () => {
    const mask = makeMask();
    const locked = buildScratchMaskContextMenu(mask as unknown as GameTableScratchMask, true, {
      lock: vi.fn(),
      unlock: vi.fn(),
    });
    expect(locked[0].name).toBe('固定解除');

    const unlocked = buildScratchMaskContextMenu(mask as unknown as GameTableScratchMask, false, {
      lock: vi.fn(),
      unlock: vi.fn(),
    });
    expect(unlocked[0].name).toBe('固定する');
  });

  it('isLocked=true なら 1 つめ action で unlock() が呼ばれる', () => {
    const mask = makeMask();
    const lock = vi.fn();
    const unlock = vi.fn();
    const menu = buildScratchMaskContextMenu(mask as unknown as GameTableScratchMask, true, { lock, unlock });
    menu[0].action?.();
    expect(unlock).toHaveBeenCalled();
    expect(lock).not.toHaveBeenCalled();
  });

  it('isLocked=false なら 1 つめ action で lock() が呼ばれる', () => {
    const mask = makeMask();
    const lock = vi.fn();
    const unlock = vi.fn();
    const menu = buildScratchMaskContextMenu(mask as unknown as GameTableScratchMask, false, { lock, unlock });
    menu[0].action?.();
    expect(lock).toHaveBeenCalled();
    expect(unlock).not.toHaveBeenCalled();
  });

  it('2 つめは separator、3 つめは「削除する」で mask.destroy() を呼ぶ', () => {
    const mask = makeMask();
    const menu = buildScratchMaskContextMenu(mask as unknown as GameTableScratchMask, false, {
      lock: vi.fn(),
      unlock: vi.fn(),
    });
    expect(menu).toHaveLength(3);
    expect(menu[1].type).toBe(ContextMenuType.SEPARATOR);
    expect(menu[2].name).toBe('削除する');
    menu[2].action?.();
    expect(mask.destroy).toHaveBeenCalled();
  });
});
