import { effectAreaTargets } from '@axe/domain/effect/effect-area';

describe('effectAreaTargets()', () => {
  const candidates = [
    { identifier: 'near', x: 60, y: 0 },
    { identifier: 'center', x: 0, y: 0 },
    { identifier: 'far', x: 400, y: 0 },
    { identifier: 'mid', x: 0, y: 150 },
  ];

  it('returns what falls within the radius, nearest first', () => {
    // That order is the order they fire in, so it spreads from the centre out.
    expect(effectAreaTargets({ x: 0, y: 0 }, candidates, 200, 10)).toEqual(['center', 'near', 'mid']);
  });

  it('stops at the limit', () => {
    expect(effectAreaTargets({ x: 0, y: 0 }, candidates, 200, 2)).toEqual(['center', 'near']);
  });

  it('picks up nothing without a radius', () => {
    expect(effectAreaTargets({ x: 0, y: 0 }, candidates, 0, 10)).toEqual([]);
    expect(effectAreaTargets({ x: 0, y: 0 }, candidates, Number.NaN, 10)).toEqual([]);
  });

  it('takes in what sits exactly on the edge', () => {
    expect(effectAreaTargets({ x: 0, y: 0 }, [{ identifier: 'edge', x: 100, y: 0 }], 100, 10)).toEqual(['edge']);
  });
});
