import { GameCharacter } from '@axe/domain/character/game-character';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementType,
} from '@axe/domain/data/data-element';

export function resourceElementsOf(character: GameCharacter): DataElement[] {
  const detail = character.detailDataElement;
  if (!detail) return [];
  return detail
    .getElementsByType(DataElementType.NUMBER_RESOURCE)
    .filter((element) => element.getAttribute(DataElementAttribute.FIELD_TYPE) === DataElementFieldType.RESOURCE);
}

export function resourceMax(element: DataElement): number {
  const max = Number(element.value);
  return Number.isFinite(max) && max > 0 ? max : 0;
}

export function resourceRatio(element: DataElement): number {
  const max = resourceMax(element);
  if (max <= 0) return 0;
  const current = Number(element.currentValue);
  if (!Number.isFinite(current)) return 0;
  return Math.min(1, Math.max(0, current / max));
}
