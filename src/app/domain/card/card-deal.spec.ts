import { planDeal } from '@axe/domain/card/card-deal';

describe('planDeal()', () => {
  it('deals everybody the same when the cards divide evenly', () => {
    const plan = planDeal(52, 4);

    expect(plan.counts).toEqual([13, 13, 13, 13]);
    expect(plan.indexes[0].slice(0, 3)).toEqual([0, 4, 8]);
  });

  it('gives the remainder out one at a time from the first player', () => {
    expect(planDeal(53, 4).counts).toEqual([14, 13, 13, 13]);
    expect(planDeal(55, 4).counts).toEqual([14, 14, 14, 13]);
  });

  it('deals the lot to a single player', () => {
    const plan = planDeal(3, 1);

    expect(plan.counts).toEqual([3]);
    expect(plan.indexes[0]).toEqual([0, 1, 2]);
  });

  it('deals nothing without cards or without players', () => {
    expect(planDeal(0, 3).counts).toEqual([0, 0, 0]);
    expect(planDeal(10, 0).counts).toEqual([]);
  });

  it('deals every card exactly once', () => {
    const plan = planDeal(54, 5);
    const dealt = plan.indexes.flat().sort((a, b) => a - b);

    expect(dealt).toEqual(Array.from({ length: 54 }, (_, index) => index));
  });
});
