import {
  type DiceRollDetail,
  diceRollDetailOf,
  diceRollValues,
  encodeDiceRollDetail,
  parseDiceRollDetail,
} from '@axe/domain/dice/dice-roll-detail';

describe('diceRollDetailOf()', () => {
  it('名前付きの出目をそのまま写すこと', () => {
    const detail = diceRollDetailOf('DiceBot', {
      detailedRands: [
        { kind: 'normal', sides: 6, value: 5 },
        { kind: 'normal', sides: 6, value: 1 },
      ],
    });

    expect(detail).toEqual({
      system: 'DiceBot',
      faces: [
        { sides: 6, value: 5, kind: 'normal' },
        { sides: 6, value: 1, kind: 'normal' },
      ],
      outcome: '',
    });
  });

  it('古い形（rands）は [出目, 面数] の順で読むこと', () => {
    // bcdice の rands は [value, sides]。逆に読むと d5 が 6 個出たことになる。
    const detail = diceRollDetailOf('DiceBot', { rands: [[5, 6]] });

    expect(detail?.faces).toEqual([{ sides: 6, value: 5, kind: 'normal' }]);
  });

  it('成否を強い順に決めること', () => {
    const critical = { critical: true, success: true };
    const fumble = { fumble: true, failure: true };

    expect(diceRollDetailOf('X', { rands: [[1, 100]], ...critical })?.outcome).toBe('critical');
    expect(diceRollDetailOf('X', { rands: [[1, 100]], ...fumble })?.outcome).toBe('fumble');
    expect(diceRollDetailOf('X', { rands: [[1, 100]], success: true })?.outcome).toBe('success');
    expect(diceRollDetailOf('X', { rands: [[1, 100]], failure: true })?.outcome).toBe('failure');
    expect(diceRollDetailOf('X', { rands: [[1, 100]] })?.outcome).toBe('');
  });

  it('中身が無いものは持ち回らないこと', () => {
    expect(diceRollDetailOf('X', null)).toBeNull();
    expect(diceRollDetailOf('X', {})).toBeNull();
    expect(diceRollDetailOf('X', { rands: [] })).toBeNull();
  });

  it('成否だけのものは残すこと', () => {
    // 出目を伴わない判定（表を引くだけ等）でも、成否が付くシステムがある。
    expect(diceRollDetailOf('X', { success: true })).toMatchObject({ faces: [], outcome: 'success' });
  });

  it('面数の無い出目は落とすこと', () => {
    expect(diceRollDetailOf('X', { detailedRands: [{ kind: 'normal', sides: 0, value: 3 }] })).toBeNull();
  });
});

describe('encodeDiceRollDetail() / parseDiceRollDetail()', () => {
  const detail: DiceRollDetail = {
    system: 'Cthulhu7th',
    faces: [
      { sides: 10, value: 3, kind: 'normal' },
      { sides: 10, value: 4, kind: 'tens_d10' },
    ],
    outcome: 'success',
  };

  it('往復して同じものになること', () => {
    expect(parseDiceRollDetail(encodeDiceRollDetail(detail))).toEqual(detail);
  });

  it('中身が無ければ空文字にすること', () => {
    expect(encodeDiceRollDetail(null)).toBe('');
  });

  it('読めない値は中身なしとして通すこと', () => {
    // 古い部屋データの同じ欄には別のものが入っていることがある。落とさない。
    expect(parseDiceRollDetail(undefined)).toBeNull();
    expect(parseDiceRollDetail('')).toBeNull();
    expect(parseDiceRollDetail('DiceBot')).toBeNull();
    expect(parseDiceRollDetail('{')).toBeNull();
    expect(parseDiceRollDetail('null')).toBeNull();
    expect(parseDiceRollDetail('{"faces":[{"sides":"x"}]}')).toBeNull();
  });

  it('壊れた出目だけを落として残りを活かすこと', () => {
    const mixed = '{"system":"X","faces":[{"sides":6,"value":4,"kind":"normal"},{"sides":0}],"outcome":""}';

    expect(parseDiceRollDetail(mixed)?.faces).toEqual([{ sides: 6, value: 4, kind: 'normal' }]);
  });
});

describe('diceRollValues()', () => {
  const detail = diceRollDetailOf('X', {
    detailedRands: [
      { kind: 'normal', sides: 6, value: 5 },
      { kind: 'normal', sides: 6, value: 1 },
      { kind: 'normal', sides: 100, value: 42 },
    ],
  });

  it('出目だけを並べること', () => {
    expect(diceRollValues(detail)).toEqual([5, 1, 42]);
  });

  it('面数で絞れること', () => {
    // 分布を数えるときは、同じ面数のダイスだけを並べないと意味が出ない。
    expect(diceRollValues(detail, 6)).toEqual([5, 1]);
  });

  it('中身が無ければ空にすること', () => {
    expect(diceRollValues(null)).toEqual([]);
  });
});
