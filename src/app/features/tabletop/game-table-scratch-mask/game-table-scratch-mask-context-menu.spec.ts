import { ContextMenuType } from '@axe/application/ui/context-menu.service';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { buildScratchMaskContextMenu } from '@axe/features/tabletop/game-table-scratch-mask/game-table-scratch-mask-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

function makeMask(): { destroy: ReturnType<typeof vi.fn> } {
  return { destroy: vi.fn() };
}

describe('buildScratchMaskContextMenu()', () => {
  it('leads with unlocking what is locked and with locking what is not', () => {
    const mask = makeMask();
    const locked = buildScratchMaskContextMenu(
      mask as unknown as GameTableScratchMask,
      true,
      { lock: vi.fn(), unlock: vi.fn() },
      t
    );
    expect(locked[0].name).toBe('固定解除');

    const unlocked = buildScratchMaskContextMenu(
      mask as unknown as GameTableScratchMask,
      false,
      { lock: vi.fn(), unlock: vi.fn() },
      t
    );
    expect(unlocked[0].name).toBe('固定する');
  });

  it('unlocks from the first item when it is locked', () => {
    const mask = makeMask();
    const lock = vi.fn();
    const unlock = vi.fn();
    const menu = buildScratchMaskContextMenu(mask as unknown as GameTableScratchMask, true, { lock, unlock }, t);
    menu[0].action?.();
    expect(unlock).toHaveBeenCalled();
    expect(lock).not.toHaveBeenCalled();
  });

  it('locks from the first item when it is not', () => {
    const mask = makeMask();
    const lock = vi.fn();
    const unlock = vi.fn();
    const menu = buildScratchMaskContextMenu(mask as unknown as GameTableScratchMask, false, { lock, unlock }, t);
    menu[0].action?.();
    expect(lock).toHaveBeenCalled();
    expect(unlock).not.toHaveBeenCalled();
  });

  it('destroys the mask from the third item, after a separator', () => {
    const mask = makeMask();
    const menu = buildScratchMaskContextMenu(
      mask as unknown as GameTableScratchMask,
      false,
      { lock: vi.fn(), unlock: vi.fn() },
      t
    );
    expect(menu).toHaveLength(3);
    expect(menu[1].type).toBe(ContextMenuType.SEPARATOR);
    expect(menu[2].name).toBe('削除する');
    menu[2].action?.();
    expect(mask.destroy).toHaveBeenCalled();
  });
});
