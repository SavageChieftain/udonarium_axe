import {
  INVENTORY_VIEW_LABEL_KEYS,
  INVENTORY_VIEW_MODES,
  isInventoryViewMode,
  nextInventoryViewMode,
} from '@axe/domain/inventory/inventory-view-mode';

describe('inventory view mode', () => {
  it('names each way of reading it', () => {
    expect(INVENTORY_VIEW_MODES).toEqual(['rich', 'table', 'round']);
    for (const mode of INVENTORY_VIEW_MODES) expect(INVENTORY_VIEW_LABEL_KEYS[mode]).toBeTruthy();
  });

  it('knows one of its own from anything else', () => {
    expect(isInventoryViewMode('table')).toBe(true);
    expect(isInventoryViewMode('minimal')).toBe(false);
    expect(isInventoryViewMode(null)).toBe(false);
  });

  it('comes back round to where it started', () => {
    expect(nextInventoryViewMode('rich')).toBe('table');
    expect(nextInventoryViewMode('table')).toBe('round');
    expect(nextInventoryViewMode('round')).toBe('rich');
  });
});
