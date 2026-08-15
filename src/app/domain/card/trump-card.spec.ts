import { Card } from '@axe/domain/card/card';
import {
  findTrumpPairs,
  isJoker,
  JOKER_RANK,
  selectExtraJokers,
  trumpCodeOf,
  trumpRankOf,
} from '@axe/domain/card/trump-card';

function trump(code: string): Card {
  return Card.create('カード', `./assets/images/trump/${code}.gif`, './assets/images/trump/z01.gif');
}

describe('trumpCodeOf()', () => {
  it('takes the code of a card out of the name of its front picture', () => {
    expect(trumpCodeOf(trump('s01'))).toBe('s01');
    expect(trumpCodeOf(trump('h13'))).toBe('h13');
    expect(trumpCodeOf(trump('x02'))).toBe('x02');
  });

  it('returns nothing for a card that is not a playing card', () => {
    expect(trumpCodeOf(Card.create('自作カード', './assets/images/custom/dragon.png', 'back.png'))).toBeNull();
  });
});

describe('trumpRankOf()', () => {
  it('returns the number whatever the suit', () => {
    expect(trumpRankOf(trump('s07'))).toBe(7);
    expect(trumpRankOf(trump('d07'))).toBe(7);
    expect(trumpRankOf(trump('c13'))).toBe(13);
  });

  it('tells a joker from a number', () => {
    expect(trumpRankOf(trump('x01'))).toBe(JOKER_RANK);
    expect(isJoker(trump('x02'))).toBe(true);
    expect(isJoker(trump('s01'))).toBe(false);
  });

  it('returns nothing for anything else', () => {
    expect(trumpRankOf(Card.create('自作カード', 'dragon.png', 'back.png'))).toBeNull();
  });
});

describe('findTrumpPairs()', () => {
  it('picks out a pair of one number', () => {
    const spade7 = trump('s07');
    const heart7 = trump('h07');
    const club3 = trump('c03');
    const pairs = findTrumpPairs([spade7, club3, heart7]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual([spade7, heart7]);
  });

  it('makes two pairs of four of a kind', () => {
    const pairs = findTrumpPairs([trump('s05'), trump('h05'), trump('d05'), trump('c05')]);

    expect(pairs).toHaveLength(2);
  });

  it('makes no pair of two jokers', () => {
    expect(findTrumpPairs([trump('x01'), trump('x02')])).toEqual([]);
  });

  it('ignores a card that is not a playing card', () => {
    const pairs = findTrumpPairs([Card.create('自作', 'a.png', 'b.png'), Card.create('自作', 'a.png', 'b.png')]);

    expect(pairs).toEqual([]);
  });
});

describe('selectExtraJokers()', () => {
  it('returns everything but one joker', () => {
    const first = trump('x01');
    const second = trump('x02');

    expect(selectExtraJokers([trump('s01'), first, second])).toEqual([second]);
  });

  it('returns nothing when there is only the one', () => {
    expect(selectExtraJokers([trump('s01'), trump('x01')])).toEqual([]);
  });

  it('returns them all when none is to be kept', () => {
    expect(selectExtraJokers([trump('x01'), trump('x02')], 0)).toHaveLength(2);
  });
});
