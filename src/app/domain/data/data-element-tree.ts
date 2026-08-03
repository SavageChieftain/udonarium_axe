import { DataElement } from '@axe/domain/data/data-element';

export function collectDataElements(root: DataElement | null): DataElement[] {
  if (!root) return [];

  const elements: DataElement[] = [];
  const walk = (element: DataElement) => {
    for (const child of element.children) {
      elements.push(child);
      walk(child);
    }
  };
  walk(root);
  return elements;
}
