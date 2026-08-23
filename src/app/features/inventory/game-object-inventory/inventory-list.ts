import { matchesSearchText, normalizeSearchText } from '@axe/core/util/text-search';
import { normalizeFolderPath } from '@axe/domain/character/character-folder';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export interface InventoryRow {
  readonly object: TabletopObject;
  readonly identifier: string;
  readonly folderPath: string;
}

export function buildInventoryRow(object: TabletopObject, folderName: string): InventoryRow {
  return { object, identifier: object.identifier, folderPath: normalizeFolderPath(folderName) };
}

export function inventorySearchText(row: InventoryRow, ownerName: string, elementTexts: readonly string[]): string {
  return normalizeSearchText([row.object.name, ownerName, row.folderPath, ...elementTexts].join(' '));
}

export function filterInventoryRows(
  rows: readonly InventoryRow[],
  terms: readonly string[],
  searchTextOf: (row: InventoryRow) => string
): InventoryRow[] {
  if (terms.length < 1) return [...rows];
  return rows.filter((row) => matchesSearchText(searchTextOf(row), terms));
}
