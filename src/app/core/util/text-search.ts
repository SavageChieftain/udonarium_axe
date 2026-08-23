import { toHalfWidth } from '@axe/core/util/string-util';

const TERM_SEPARATOR = /[\s\u3000]+/;

export function normalizeSearchText(value: string): string {
  return toHalfWidth(value).toLowerCase().trim();
}

export function splitSearchTerms(query: string): string[] {
  return normalizeSearchText(query)
    .split(TERM_SEPARATOR)
    .filter((term) => term.length > 0);
}

export function matchesSearchText(searchText: string, terms: readonly string[]): boolean {
  return terms.every((term) => searchText.includes(term));
}
