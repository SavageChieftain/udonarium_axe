import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { handLocationOf } from '@axe/domain/card/hand-location';
import { isHandCardOf, reorderHandCards, selectHandCards } from '@axe/features/pl-tools/hand-rail/hand-cards';
import { afterEach, describe, expect, it } from 'vitest';

function makeCard(locationName: string): Card {
  const card = Card.create('カード', 'front.png', 'back.png');
  card.location.name = locationName;
  return card;
}

describe('hand-cards', () => {
  afterEach(() => {
    const store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  it('自分の手札に置かれたカードだけを手札とみなす', () => {
    expect(isHandCardOf(makeCard(handLocationOf('me')), 'me')).toBe(true);
  });

  it('他人の手札は自分の手札ではない', () => {
    expect(isHandCardOf(makeCard(handLocationOf('other')), 'me')).toBe(false);
  });

  it('卓上・墓場のカードは手札ではない', () => {
    expect(isHandCardOf(makeCard('table'), 'me')).toBe(false);
    expect(isHandCardOf(makeCard('graveyard'), 'me')).toBe(false);
  });

  it('所有権だけでは手札にならない', () => {
    const card = makeCard('table');
    card.owner = 'me';
    expect(isHandCardOf(card, 'me')).toBe(false);
  });

  it('userId が空なら何も手札にしない', () => {
    expect(isHandCardOf(makeCard(handLocationOf('me')), '')).toBe(false);
  });

  it('手札順が同値なら元の順序を保つ', () => {
    const mine = makeCard(handLocationOf('me'));
    const others = makeCard(handLocationOf('other'));
    const onTable = makeCard('table');
    const alsoMine = makeCard(handLocationOf('me'));

    expect(selectHandCards([mine, others, onTable, alsoMine], 'me')).toEqual([mine, alsoMine]);
  });

  it('手札順の昇順で並べる', () => {
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

  it('後ろへ動かす', () => {
    expect(reorderHandCards(items, 0, 3)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('前へ動かす', () => {
    expect(reorderHandCards(items, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('末尾へ動かす', () => {
    expect(reorderHandCards(items, 1, 4)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('同じ位置に落とせば並びは変わらない', () => {
    expect(reorderHandCards(items, 2, 2)).toEqual(['a', 'b', 'c', 'd']);
    expect(reorderHandCards(items, 2, 3)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('範囲外の移動元は無視する', () => {
    expect(reorderHandCards(items, -1, 2)).toEqual(['a', 'b', 'c', 'd']);
    expect(reorderHandCards(items, 9, 2)).toEqual(['a', 'b', 'c', 'd']);
  });
});
