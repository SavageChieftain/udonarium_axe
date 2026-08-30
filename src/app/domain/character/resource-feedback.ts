import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';

/**
 * What a resource does to the table when it moves.
 *
 * An effect is played unless the field says otherwise, as it has always been.
 * A sound is played only where the field asks for one: a table that hears a blow for every
 * point of every counter soon hears nothing at all.
 */
export function playsEffectOnChange(element: DataElement): boolean {
  return element.getAttribute(DataElementAttribute.CHANGE_EFFECT) !== 'false';
}

export function playsSoundOnChange(element: DataElement): boolean {
  return element.getAttribute(DataElementAttribute.CHANGE_SOUND) === 'true';
}
