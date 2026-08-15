import { Card } from '@axe/domain/card/card';
import { resolveFlipCutIn } from '@axe/domain/card/card-cut-in';
import { CutIn } from '@axe/domain/media/cut-in';

describe('resolveFlipCutIn()', () => {
  const created: { destroy(): void }[] = [];

  function card(name: string, cutInIdentifier = ''): Card {
    const object = Card.create(name, 'front.png', 'back.png');
    object.cutInIdentifier = cutInIdentifier;
    created.push(object);
    return object;
  }

  function cutIn(name: string): CutIn {
    const object = new CutIn();
    object.name = name;
    object.initialize();
    created.push(object);
    return object;
  }

  afterEach(() => {
    for (const object of created.splice(0)) object.destroy();
  });

  it('returns the cut-in tied to the card', () => {
    const assigned = cutIn('別の演出');
    const other = cutIn('ドラゴン');

    expect(resolveFlipCutIn(card('ドラゴン', assigned.identifier), [other, assigned])).toBe(assigned);
  });

  it('falls back to one of the same name', () => {
    const dragon = cutIn('ドラゴン');

    expect(resolveFlipCutIn(card('ドラゴン'), [cutIn('魔道士'), dragon])).toBe(dragon);
  });

  it('returns nothing rather than falling back when the tie is broken', () => {
    expect(resolveFlipCutIn(card('ドラゴン', 'missing'), [cutIn('ドラゴン')])).toBeNull();
  });

  it('returns nothing when no name matches', () => {
    expect(resolveFlipCutIn(card('ドラゴン'), [cutIn('魔道士')])).toBeNull();
  });

  it('returns nothing for a card with no name', () => {
    expect(resolveFlipCutIn(card('  '), [cutIn('  ')])).toBeNull();
  });
});
