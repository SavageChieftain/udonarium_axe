import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { isHandCardOf, selectHandCards } from '@axe/features/pl-tools/hand-card-list/hand-cards';
import { afterEach, describe, expect, it } from 'vitest';

function makeCard(owner: string, locationName: string): Card {
  const card = Card.create('カード', 'front.png', 'back.png');
  card.owner = owner;
  card.location.name = locationName;
  return card;
}

describe('hand-cards', () => {
  afterEach(() => {
    const store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  it('自分が所有するカードを手札とみなす', () => {
    expect(isHandCardOf(makeCard('me', 'table'), 'me')).toBe(true);
  });

  it('他人の所有・未所有のカードは手札ではない', () => {
    expect(isHandCardOf(makeCard('other', 'table'), 'me')).toBe(false);
    expect(isHandCardOf(makeCard('', 'table'), 'me')).toBe(false);
  });

  it('墓場のカードは手札ではない', () => {
    expect(isHandCardOf(makeCard('me', 'graveyard'), 'me')).toBe(false);
  });

  it('userId が空なら何も手札にしない', () => {
    expect(isHandCardOf(makeCard('', 'table'), '')).toBe(false);
  });

  it('自分の手札だけを元の順序で返す', () => {
    const mine = makeCard('me', 'table');
    const others = makeCard('other', 'table');
    const buried = makeCard('me', 'graveyard');
    const alsoMine = makeCard('me', 'table');

    expect(selectHandCards([mine, others, buried, alsoMine], 'me')).toEqual([mine, alsoMine]);
  });
});
