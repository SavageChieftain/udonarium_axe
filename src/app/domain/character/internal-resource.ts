import { DataElement } from '@axe/domain/data/data-element';

export const INTERNAL_RESOURCE_NAMES: ReadonlySet<string> = new Set(['ICON', 'POS']);

export function isInternalResource(element: DataElement): boolean {
  return INTERNAL_RESOURCE_NAMES.has(element.name);
}
