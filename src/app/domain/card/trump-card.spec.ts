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
  it('表面画像のファイル名からカードのコードを取り出すこと', () => {
    expect(trumpCodeOf(trump('s01'))).toBe('s01');
    expect(trumpCodeOf(trump('h13'))).toBe('h13');
    expect(trumpCodeOf(trump('x02'))).toBe('x02');
  });

  it('トランプ以外のカードでは null を返すこと', () => {
    expect(trumpCodeOf(Card.create('自作カード', './assets/images/custom/dragon.png', 'back.png'))).toBeNull();
  });
});

describe('trumpRankOf()', () => {
  it('スートに関係なく数字を返すこと', () => {
    expect(trumpRankOf(trump('s07'))).toBe(7);
    expect(trumpRankOf(trump('d07'))).toBe(7);
    expect(trumpRankOf(trump('c13'))).toBe(13);
  });

  it('ジョーカーを数字と区別すること', () => {
    expect(trumpRankOf(trump('x01'))).toBe(JOKER_RANK);
    expect(isJoker(trump('x02'))).toBe(true);
    expect(isJoker(trump('s01'))).toBe(false);
  });

  it('トランプ以外では null を返すこと', () => {
    expect(trumpRankOf(Card.create('自作カード', 'dragon.png', 'back.png'))).toBeNull();
  });
});

describe('findTrumpPairs()', () => {
  it('同じ数字の 2 枚組を取り出すこと', () => {
    const spade7 = trump('s07');
    const heart7 = trump('h07');
    const club3 = trump('c03');
    const pairs = findTrumpPairs([spade7, club3, heart7]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual([spade7, heart7]);
  });

  it('4 枚そろっていれば 2 組にすること', () => {
    const pairs = findTrumpPairs([trump('s05'), trump('h05'), trump('d05'), trump('c05')]);

    expect(pairs).toHaveLength(2);
  });

  it('ジョーカー同士は組にしないこと', () => {
    expect(findTrumpPairs([trump('x01'), trump('x02')])).toEqual([]);
  });

  it('トランプ以外のカードは無視すること', () => {
    const pairs = findTrumpPairs([Card.create('自作', 'a.png', 'b.png'), Card.create('自作', 'a.png', 'b.png')]);

    expect(pairs).toEqual([]);
  });
});

describe('selectExtraJokers()', () => {
  it('ジョーカーを 1 枚だけ残して残りを返すこと', () => {
    const first = trump('x01');
    const second = trump('x02');

    expect(selectExtraJokers([trump('s01'), first, second])).toEqual([second]);
  });

  it('ジョーカーが 1 枚だけなら何も返さないこと', () => {
    expect(selectExtraJokers([trump('s01'), trump('x01')])).toEqual([]);
  });

  it('残す枚数を 0 にすればすべて返すこと', () => {
    expect(selectExtraJokers([trump('x01'), trump('x02')], 0)).toHaveLength(2);
  });
});
