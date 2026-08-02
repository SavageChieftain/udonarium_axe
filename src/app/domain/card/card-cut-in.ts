import { Card } from '@axe/domain/card/card';
import { CutIn } from '@axe/domain/media/cut-in';

/** 明示的な紐づけを優先し、無ければカード名と同じ名前のカットインを使う。 */
export function resolveFlipCutIn(card: Card, cutIns: readonly CutIn[]): CutIn | null {
  if (card.cutInIdentifier.length > 0) {
    return cutIns.find((cutIn) => cutIn.identifier === card.cutInIdentifier) ?? null;
  }
  const name = card.name.trim();
  if (name.length < 1) return null;
  return cutIns.find((cutIn) => cutIn.name.trim() === name) ?? null;
}
