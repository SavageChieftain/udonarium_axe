import { diceRollLog } from '@axe/domain/dice/dice-roll-log';

describe('diceRollLog()', () => {
  it('names one die and what it showed', () => {
    expect(diceRollLog([{ name: 'ゴブリンのダイス', face: '5', sides: 6 }])).toEqual({
      count: 1,
      dice: 'ゴブリンのダイス',
      results: '5',
      total: 5,
    });
  });

  it('keeps several in the order they were thrown', () => {
    const log = diceRollLog([
      { name: 'A', face: '3', sides: 6 },
      { name: 'B', face: '5', sides: 6 },
      { name: 'C', face: '18', sides: 20 },
    ]);

    expect(log).toEqual({ count: 3, dice: 'A, B, C', results: '3, 5, 18', total: 26 });
  });

  it('names a die with no name of its own by its faces', () => {
    expect(diceRollLog([{ name: '  ', face: '4', sides: 6 }])?.dice).toBe('D6');
  });

  it('adds nothing up when a face is not a number', () => {
    // A die with words on its faces has no total, and adding the rest would read as the whole throw.
    const log = diceRollLog([
      { name: 'A', face: '3', sides: 6 },
      { name: 'B', face: '大成功', sides: 6 },
    ]);

    expect(log?.results).toBe('3, 大成功');
    expect(log?.total).toBeNull();
  });

  it('returns nothing when nothing was thrown', () => {
    expect(diceRollLog([])).toBeNull();
  });
});
