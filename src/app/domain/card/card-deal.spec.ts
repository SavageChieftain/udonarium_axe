import { planDeal } from '@axe/domain/card/card-deal';

describe('planDeal()', () => {
  it('割り切れるときは全員に同じ枚数を配ること', () => {
    const plan = planDeal(52, 4);

    expect(plan.counts).toEqual([13, 13, 13, 13]);
    expect(plan.indexes[0].slice(0, 3)).toEqual([0, 4, 8]);
  });

  it('余りは先に配る人から 1 枚ずつ多くすること', () => {
    expect(planDeal(53, 4).counts).toEqual([14, 13, 13, 13]);
    expect(planDeal(55, 4).counts).toEqual([14, 14, 14, 13]);
  });

  it('参加者が 1 人ならすべてその人へ配ること', () => {
    const plan = planDeal(3, 1);

    expect(plan.counts).toEqual([3]);
    expect(plan.indexes[0]).toEqual([0, 1, 2]);
  });

  it('配るカードや参加者が無ければ何も配らないこと', () => {
    expect(planDeal(0, 3).counts).toEqual([0, 0, 0]);
    expect(planDeal(10, 0).counts).toEqual([]);
  });

  it('すべてのカードがちょうど 1 回ずつ配られること', () => {
    const plan = planDeal(54, 5);
    const dealt = plan.indexes.flat().sort((a, b) => a - b);

    expect(dealt).toEqual(Array.from({ length: 54 }, (_, index) => index));
  });
});
