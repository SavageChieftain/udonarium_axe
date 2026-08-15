import {
  type DiceRollDetail,
  diceRollDetailOf,
  diceRollValues,
  encodeDiceRollDetail,
  parseDiceRollDetail,
} from '@axe/domain/dice/dice-roll-detail';

describe('diceRollDetailOf()', () => {
  it('copies a named roll as it is', () => {
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

  it('reads the older form in its own order', () => {
    // That order is the roll and then the faces; read the other way round it becomes six of a five-sided die.
    const detail = diceRollDetailOf('DiceBot', { rands: [[5, 6]] });

    expect(detail?.faces).toEqual([{ sides: 6, value: 5, kind: 'normal' }]);
  });

  it('decides the outcome from the strongest down', () => {
    const critical = { critical: true, success: true };
    const fumble = { fumble: true, failure: true };

    expect(diceRollDetailOf('X', { rands: [[1, 100]], ...critical })?.outcome).toBe('critical');
    expect(diceRollDetailOf('X', { rands: [[1, 100]], ...fumble })?.outcome).toBe('fumble');
    expect(diceRollDetailOf('X', { rands: [[1, 100]], success: true })?.outcome).toBe('success');
    expect(diceRollDetailOf('X', { rands: [[1, 100]], failure: true })?.outcome).toBe('failure');
    expect(diceRollDetailOf('X', { rands: [[1, 100]] })?.outcome).toBe('');
  });

  it('carries nothing that holds nothing', () => {
    expect(diceRollDetailOf('X', null)).toBeNull();
    expect(diceRollDetailOf('X', {})).toBeNull();
    expect(diceRollDetailOf('X', { rands: [] })).toBeNull();
  });

  it('keeps one that holds the outcome alone', () => {
    // Some systems attach an outcome even to a roll with no dice, such as drawing from a table.
    expect(diceRollDetailOf('X', { success: true })).toMatchObject({ faces: [], outcome: 'success' });
  });

  it('drops a roll with no number of faces', () => {
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

  it('comes back the same through the round trip', () => {
    expect(parseDiceRollDetail(encodeDiceRollDetail(detail))).toEqual(detail);
  });

  it('writes nothing when it holds nothing', () => {
    expect(encodeDiceRollDetail(null)).toBe('');
  });

  it('passes a value it cannot read through as nothing', () => {
    // The same field in older room data may hold something else, which is not thrown away.
    expect(parseDiceRollDetail(undefined)).toBeNull();
    expect(parseDiceRollDetail('')).toBeNull();
    expect(parseDiceRollDetail('DiceBot')).toBeNull();
    expect(parseDiceRollDetail('{')).toBeNull();
    expect(parseDiceRollDetail('null')).toBeNull();
    expect(parseDiceRollDetail('{"faces":[{"sides":"x"}]}')).toBeNull();
  });

  it('drops the broken rolls alone and keeps the rest', () => {
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

  it('lists the rolls alone', () => {
    expect(diceRollValues(detail)).toEqual([5, 1, 42]);
  });

  it('narrows by the number of faces', () => {
    // A distribution means nothing unless the dice counted have the same number of faces.
    expect(diceRollValues(detail, 6)).toEqual([5, 1]);
  });

  it('returns nothing when it holds nothing', () => {
    expect(diceRollValues(null)).toEqual([]);
  });
});
