import { isInternalResource } from '@axe/domain/character/internal-resource';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { describe, expect, it } from 'vitest';

function elementNamed(name: string): DataElement {
  return DataElement.create(name, 11, { type: DataElementType.NUMBER_RESOURCE, currentValue: '0' });
}

describe('internal-resource', () => {
  it('knows the portrait slot and the piece image are the sheet’s own fields', () => {
    expect(isInternalResource(elementNamed('POS'))).toBe(true);
    expect(isInternalResource(elementNamed('ICON'))).toBe(true);
  });

  it('leaves the resources a player keeps alone', () => {
    expect(isInternalResource(elementNamed('HP'))).toBe(false);
    expect(isInternalResource(elementNamed('MP'))).toBe(false);
  });
});
