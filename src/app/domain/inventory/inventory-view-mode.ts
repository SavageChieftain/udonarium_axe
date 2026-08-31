/** How much of each piece the inventory draws. */
export type InventoryViewMode = 'rich' | 'table' | 'minimal';

export const INVENTORY_VIEW_MODES: readonly InventoryViewMode[] = ['rich', 'table', 'minimal'];

export const INVENTORY_VIEW_LABEL_KEYS: Record<InventoryViewMode, string> = {
  rich: 'feature.inventory.panel.viewRich',
  table: 'feature.inventory.panel.viewTable',
  minimal: 'feature.inventory.panel.viewMinimal',
};

export function isInventoryViewMode(value: unknown): value is InventoryViewMode {
  return typeof value === 'string' && INVENTORY_VIEW_MODES.includes(value as InventoryViewMode);
}
