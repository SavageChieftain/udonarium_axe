/** The strips above the list, each of which a reader may put away. */
export type InventoryChromePart = 'tabs' | 'filter' | 'round';

export const INVENTORY_CHROME_PARTS: readonly InventoryChromePart[] = ['tabs', 'filter', 'round'];

export const INVENTORY_CHROME_LABEL_KEYS: Record<InventoryChromePart, string> = {
  tabs: 'feature.inventory.panel.showTabs',
  filter: 'feature.inventory.panel.showFilterLine',
  round: 'feature.inventory.panel.showRoundLine',
};

export function isInventoryChromePart(value: unknown): value is InventoryChromePart {
  return typeof value === 'string' && INVENTORY_CHROME_PARTS.includes(value as InventoryChromePart);
}

/** What was put away, written down as one line. Anything unknown is passed over. */
export function parseHiddenChromeParts(stored: string | null): InventoryChromePart[] {
  return (stored ?? '').split(/[\s,]+/).filter((token): token is InventoryChromePart => isInventoryChromePart(token));
}

export function formatHiddenChromeParts(parts: Iterable<InventoryChromePart>): string {
  return [...parts].join(',');
}
