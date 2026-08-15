import { linkRollsToDice } from '@axe/domain/dice/dice-link';
import { DiceRollFace } from '@axe/domain/dice/dice-roll-detail';

function roll(sides: number, value: number, kind = 'normal'): DiceRollFace {
  return { sides, value, kind };
}

const d6 = { faces: ['1', '2', '3', '4', '5', '6'] };
const d20 = { faces: Array.from({ length: 20 }, (_, i) => String(i + 1)) };
const tens = { faces: ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100'] };

describe('linkRollsToDice()', () => {
  it('gives each die a roll of its own faces', () => {
    const dice = [{ ...d6 }, { ...d6 }];

    const linked = linkRollsToDice(dice, [roll(6, 3), roll(6, 5)]);

    expect(linked.map((entry) => entry.face)).toEqual(['3', '5']);
    expect(linked.map((entry) => entry.die)).toEqual(dice);
  });

  it('passes over a roll of another size', () => {
    const linked = linkRollsToDice([d20, d6], [roll(6, 4), roll(20, 18)]);

    expect(linked).toEqual([
      { die: d20, face: '18' },
      { die: d6, face: '4' },
    ]);
  });

  it('uses each roll once', () => {
    const linked = linkRollsToDice([d6, d6], [roll(6, 2)]);

    expect(linked).toHaveLength(1);
  });

  it('leaves a die that cannot show the number as it was', () => {
    // A die counting by tens has no face for a three, and a face it does not have is worse than none.
    expect(linkRollsToDice([tens], [roll(10, 3)])).toEqual([]);
  });

  it('gives a die counting by tens the roll it can show', () => {
    expect(linkRollsToDice([tens], [roll(10, 30, 'tens_d10')])).toEqual([{ die: tens, face: '30' }]);
  });

  it('links nothing without dice or rolls', () => {
    expect(linkRollsToDice([], [roll(6, 3)])).toEqual([]);
    expect(linkRollsToDice([d6], [])).toEqual([]);
  });
});
