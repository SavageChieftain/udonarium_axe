import { Card } from '@axe/domain/card/card';
import { selectOverlappingCards } from '@axe/features/card/card/overlapping-cards';
import { afterEach, describe, expect, it } from 'vitest';

function makeCard(x: number, y: number, zindex = 0, posZ = 0): Card {
  const card = Card.create('カード', 'front.png', 'back.png');
  card.location.x = x;
  card.location.y = y;
  card.posZ = posZ;
  card.zindex = zindex;
  return card;
}

describe('selectOverlappingCards', () => {
  afterEach(() => {});

  it('counts the card it starts from', () => {
    const origin = makeCard(0, 0);
    expect(selectOverlappingCards([origin], origin)).toEqual([origin]);
  });

  it('gathers only what falls inside the radius', () => {
    const origin = makeCard(0, 0);
    const near = makeCard(50, 50);
    const far = makeCard(300, 0);

    expect(selectOverlappingCards([origin, near, far], origin)).toEqual([origin, near]);
  });

  it('counts a difference in height as distance', () => {
    const origin = makeCard(0, 0);
    const above = makeCard(0, 0, 0, 300);

    expect(selectOverlappingCards([origin, above], origin)).toEqual([origin]);
  });

  it('orders them from the top of the pile down', () => {
    const bottom = makeCard(0, 0, 1);
    const top = makeCard(10, 10, 5);
    const middle = makeCard(20, 20, 3);

    expect(selectOverlappingCards([bottom, top, middle], bottom)).toEqual([top, middle, bottom]);
  });

  it('takes any radius it is given', () => {
    const origin = makeCard(0, 0);
    const near = makeCard(50, 0);

    expect(selectOverlappingCards([origin, near], origin, 20)).toEqual([origin]);
  });
});
