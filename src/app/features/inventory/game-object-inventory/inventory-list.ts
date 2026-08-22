import { toHalfWidth } from '@axe/core/util/string-util';
import { normalizeFolderPath } from '@axe/domain/character/character-folder';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export interface InventoryRow {
  readonly object: TabletopObject;
  readonly identifier: string;
  readonly folderPath: string;
}

const TERM_SEPARATOR = /[\s\u3000]+/;

export function normalizeInventoryText(value: string): string {
  return toHalfWidth(value).toLowerCase().trim();
}

export function splitSearchTerms(query: string): string[] {
  return normalizeInventoryText(query)
    .split(TERM_SEPARATOR)
    .filter((term) => term.length > 0);
}

export function buildInventoryRow(object: TabletopObject, folderName: string): InventoryRow {
  return { object, identifier: object.identifier, folderPath: normalizeFolderPath(folderName) };
}

export function inventorySearchText(row: InventoryRow, ownerName: string, elementTexts: readonly string[]): string {
  return normalizeInventoryText([row.object.name, ownerName, row.folderPath, ...elementTexts].join(' '));
}

export function matchesSearchText(searchText: string, terms: readonly string[]): boolean {
  return terms.every((term) => searchText.includes(term));
}

export function filterInventoryRows(
  rows: readonly InventoryRow[],
  terms: readonly string[],
  searchTextOf: (row: InventoryRow) => string
): InventoryRow[] {
  if (terms.length < 1) return [...rows];
  return rows.filter((row) => matchesSearchText(searchTextOf(row), terms));
}
