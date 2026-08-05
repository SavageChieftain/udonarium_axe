import { effectAreaTargets } from '@axe/domain/effect/effect-area';

describe('effectAreaTargets()', () => {
  const candidates = [
    { identifier: 'near', x: 60, y: 0 },
    { identifier: 'center', x: 0, y: 0 },
    { identifier: 'far', x: 400, y: 0 },
    { identifier: 'mid', x: 0, y: 150 },
  ];

  it('半径内を近い順に返すこと', () => {
    // 並び順がそのまま発動順になるので、中心から外へ広がって見える。
    expect(effectAreaTargets({ x: 0, y: 0 }, candidates, 200, 10)).toEqual(['center', 'near', 'mid']);
  });

  it('上限で切ること', () => {
    expect(effectAreaTargets({ x: 0, y: 0 }, candidates, 200, 2)).toEqual(['center', 'near']);
  });

  it('半径が無ければ何も拾わないこと', () => {
    expect(effectAreaTargets({ x: 0, y: 0 }, candidates, 0, 10)).toEqual([]);
    expect(effectAreaTargets({ x: 0, y: 0 }, candidates, Number.NaN, 10)).toEqual([]);
  });

  it('境界のちょうど上を含むこと', () => {
    expect(effectAreaTargets({ x: 0, y: 0 }, [{ identifier: 'edge', x: 100, y: 0 }], 100, 10)).toEqual(['edge']);
  });
});
