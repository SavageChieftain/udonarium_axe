import { Card } from '@axe/domain/card/card';
import { CutIn } from '@axe/domain/media/cut-in';

/** A tie wins; without one, a cut-in of the same name as the card is used. */
export function resolveFlipCutIn(card: Card, cutIns: readonly CutIn[]): CutIn | null {
  if (card.cutInIdentifier.length > 0) {
    return cutIns.find((cutIn) => cutIn.identifier === card.cutInIdentifier) ?? null;
  }
  const name = card.name.trim();
  if (name.length < 1) return null;
  return cutIns.find((cutIn) => cutIn.name.trim() === name) ?? null;
}
