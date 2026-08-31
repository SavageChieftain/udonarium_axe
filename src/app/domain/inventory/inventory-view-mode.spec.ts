import {
  INVENTORY_VIEW_LABEL_KEYS,
  INVENTORY_VIEW_MODES,
  isInventoryViewMode,
} from '@axe/domain/inventory/inventory-view-mode';

describe('inventory view mode', () => {
  it('names each way of reading it', () => {
    expect(INVENTORY_VIEW_MODES).toEqual(['rich', 'table', 'minimal']);
    for (const mode of INVENTORY_VIEW_MODES) expect(INVENTORY_VIEW_LABEL_KEYS[mode]).toBeTruthy();
  });

  it('knows one of its own from anything else', () => {
    expect(isInventoryViewMode('table')).toBe(true);
    expect(isInventoryViewMode('compact')).toBe(false);
    expect(isInventoryViewMode(null)).toBe(false);
  });
});
