import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';

/**
 * What a resource does to the table when it moves.
 *
 * Neither an effect nor a sound is played unless the field asks for one: a table that sees a
 * blow struck and hears it for every point of every counter soon notices none of them.
 */
export function playsEffectOnChange(element: DataElement): boolean {
  return element.getAttribute(DataElementAttribute.CHANGE_EFFECT) === 'true';
}

export function playsSoundOnChange(element: DataElement): boolean {
  return element.getAttribute(DataElementAttribute.CHANGE_SOUND) === 'true';
}
