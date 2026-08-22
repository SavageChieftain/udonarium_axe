import { toHalfWidth } from '@axe/core/util/string-util';
import { normalizeFolderPath } from '@axe/domain/character/character-folder';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export interface InventoryRow {
  readonly object: TabletopObject;
  readonly identifier: string;
  readonly folderPath: string;
  readonly searchText: string;
}

export interface InventoryRowSource {
  readonly object: TabletopObject;
  readonly folderName: string;
  readonly ownerName: string;
  readonly elementTexts: readonly string[];
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

export function buildInventoryRow(source: InventoryRowSource): InventoryRow {
  const folderPath = normalizeFolderPath(source.folderName);
  return {
    object: source.object,
    identifier: source.object.identifier,
    folderPath,
    searchText: normalizeInventoryText(
      [source.object.name, source.ownerName, folderPath, ...source.elementTexts].join(' ')
    ),
  };
}

export function matchesInventoryRow(row: InventoryRow, terms: readonly string[]): boolean {
  return terms.every((term) => row.searchText.includes(term));
}

export function filterInventoryRows(rows: readonly InventoryRow[], terms: readonly string[]): InventoryRow[] {
  if (terms.length < 1) return [...rows];
  return rows.filter((row) => matchesInventoryRow(row, terms));
}
