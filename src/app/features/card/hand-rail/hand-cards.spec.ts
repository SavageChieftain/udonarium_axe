import { Card } from '@axe/domain/card/card';
import { handLocationOf } from '@axe/domain/card/hand-location';
import { isHandCardOf, reorderHandCards, selectHandCards } from '@axe/features/card/hand-rail/hand-cards';
import { afterEach, describe, expect, it } from 'vitest';

function makeCard(locationName: string): Card {
  const card = Card.create('カード', 'front.png', 'back.png');
  card.location.name = locationName;
  return card;
}

describe('hand-cards', () => {
  afterEach(() => {});

  it('counts only the cards in your own hands as a hand', () => {
    expect(isHandCardOf(makeCard(handLocationOf('me')), 'me')).toBe(true);
  });

  it('leaves somebody elses out of it', () => {
    expect(isHandCardOf(makeCard(handLocationOf('other')), 'me')).toBe(false);
  });

  it('leaves out what is on the table or in the graveyard', () => {
    expect(isHandCardOf(makeCard('table'), 'me')).toBe(false);
    expect(isHandCardOf(makeCard('graveyard'), 'me')).toBe(false);
  });

  it('does not count a card by ownership alone', () => {
    const card = makeCard('table');
    card.owner = 'me';
    expect(isHandCardOf(card, 'me')).toBe(false);
  });

  it('counts nothing without a user', () => {
    expect(isHandCardOf(makeCard(handLocationOf('me')), '')).toBe(false);
  });

  it('keeps the order it was given between equals', () => {
    const mine = makeCard(handLocationOf('me'));
    const others = makeCard(handLocationOf('other'));
    const onTable = makeCard('table');
    const alsoMine = makeCard(handLocationOf('me'));

    expect(selectHandCards([mine, others, onTable, alsoMine], 'me')).toEqual([mine, alsoMine]);
  });

  it('sorts the hand by its order', () => {
    const a = makeCard(handLocationOf('me'));
    const b = makeCard(handLocationOf('me'));
    const c = makeCard(handLocationOf('me'));
    a.handOrder = 2;
    b.handOrder = 0;
    c.handOrder = 1;

    expect(selectHandCards([a, b, c], 'me')).toEqual([b, c, a]);
  });
});

describe('reorderHandCards', () => {
  const items = ['a', 'b', 'c', 'd'] as unknown as Card[];

  it('moves a card back', () => {
    expect(reorderHandCards(items, 0, 3)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves one forward', () => {
    expect(reorderHandCards(items, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('moves one to the end', () => {
    expect(reorderHandCards(items, 1, 4)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('changes nothing when a card lands where it was', () => {
    expect(reorderHandCards(items, 2, 2)).toEqual(['a', 'b', 'c', 'd']);
    expect(reorderHandCards(items, 2, 3)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ignores a move from outside the hand', () => {
    expect(reorderHandCards(items, -1, 2)).toEqual(['a', 'b', 'c', 'd']);
    expect(reorderHandCards(items, 9, 2)).toEqual(['a', 'b', 'c', 'd']);
  });
});
