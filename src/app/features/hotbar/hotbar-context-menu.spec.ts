import { buildHotbarBarContextMenu, buildHotbarSlotContextMenu } from '@axe/features/hotbar/hotbar-context-menu';

const t = (key: string) => key;

describe('the menu a hotbar offers', () => {
  describe('on a slot', () => {
    it('offers to fill an empty one, and nothing to copy or clear', () => {
      const names = buildHotbarSlotContextMenu(false, { onEdit: () => undefined }, t).map((action) => action.name);

      expect(names).toEqual(['feature.hotbar.menu.fill']);
    });

    it('offers to edit, copy and clear a filled one', () => {
      const names = buildHotbarSlotContextMenu(
        true,
        { onEdit: () => undefined, onCopy: () => undefined, onClear: () => undefined },
        t
      ).map((action) => action.name);

      expect(names).toContain('feature.hotbar.menu.edit');
      expect(names).toContain('feature.hotbar.menu.copy');
      expect(names).toContain('feature.hotbar.menu.clear');
    });

    it('offers to paste only when something is being carried', () => {
      const without = buildHotbarSlotContextMenu(false, { onEdit: () => undefined }, t).map((action) => action.name);
      const carrying = buildHotbarSlotContextMenu(false, { onEdit: () => undefined, onPaste: () => undefined }, t).map(
        (action) => action.name
      );

      expect(without).not.toContain('feature.hotbar.menu.paste');
      expect(carrying).toContain('feature.hotbar.menu.paste');
    });

    it('calls back the thing it was asked to', () => {
      const onEdit = vi.fn();
      buildHotbarSlotContextMenu(false, { onEdit }, t)[0].action?.();

      expect(onEdit).toHaveBeenCalled();
    });
  });

  describe('on the bar', () => {
    const callbacks = {
      onToggleLabel: () => undefined,
      onToggleHint: () => undefined,
      onTogglePin: () => undefined,
      onResetPlace: () => undefined,
      onLoad: () => undefined,
      onHide: () => undefined,
    };

    it('ticks what is on', () => {
      const names = buildHotbarBarContextMenu({ showsLabel: true, showsHint: true, pinned: true }, callbacks, t).map(
        (action) => action.name
      );

      expect(names[0]).toBe('✔ feature.hotbar.menu.showLabel');
      expect(names[1]).toBe('✔ feature.hotbar.menu.showHint');
      expect(names[2]).toBe('✔ feature.hotbar.pin');
    });

    it('offers to bring a slot back only when one was cleared', () => {
      const plain = buildHotbarBarContextMenu({ showsLabel: true, showsHint: true, pinned: false }, callbacks, t).map(
        (action) => action.name
      );
      const afterClearing = buildHotbarBarContextMenu(
        { showsLabel: true, showsHint: true, pinned: false },
        { ...callbacks, onUndo: () => undefined },
        t
      ).map((action) => action.name);

      expect(plain).not.toContain('feature.hotbar.menu.undo');
      expect(afterClearing).toContain('feature.hotbar.menu.undo');
    });

    it('offers to read a bar in from a file', () => {
      const names = buildHotbarBarContextMenu({ showsLabel: false, showsHint: false, pinned: false }, callbacks, t).map(
        (action) => action.name
      );

      expect(names).toContain('feature.hotbar.menu.load');
    });

    it('offers to put back the bar a file replaced, only once one has been read', () => {
      const plain = buildHotbarBarContextMenu({ showsLabel: false, showsHint: false, pinned: false }, callbacks, t).map(
        (action) => action.name
      );
      const afterReading = buildHotbarBarContextMenu(
        { showsLabel: false, showsHint: false, pinned: false },
        { ...callbacks, onUndoRead: () => undefined },
        t
      ).map((action) => action.name);

      expect(plain).not.toContain('feature.hotbar.menu.undoRead');
      expect(afterReading).toContain('feature.hotbar.menu.undoRead');
    });

    it('always offers to put the bar away', () => {
      const names = buildHotbarBarContextMenu({ showsLabel: false, showsHint: false, pinned: false }, callbacks, t).map(
        (action) => action.name
      );

      expect(names[names.length - 1]).toBe('feature.hotbar.menu.hide');
    });
  });
});
