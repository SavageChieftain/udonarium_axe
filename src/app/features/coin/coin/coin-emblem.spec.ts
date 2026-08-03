import { laurelLeaves, starPoints } from '@axe/features/coin/coin/coin-emblem';

describe('starPoints()', () => {
  it('外周と内周を交互に結ぶ頂点を返すこと', () => {
    const points = starPoints(50, 20, 10, 5)
      .split(' ')
      .map((point) => point.split(',').map(Number));

    expect(points).toHaveLength(10);
    expect(points[0]).toEqual([50, 30]);

    const radiusOf = ([x, y]: number[]) => Math.hypot(x - 50, y - 50);
    expect(radiusOf(points[0])).toBeCloseTo(20, 1);
    expect(radiusOf(points[1])).toBeCloseTo(10, 1);
    expect(radiusOf(points[8])).toBeCloseTo(20, 1);
  });

  it('頂点の数を変えられること', () => {
    expect(starPoints(50, 20, 10, 8).split(' ')).toHaveLength(16);
  });
});

describe('laurelLeaves()', () => {
  it('左右の枝に同数の葉を並べること', () => {
    const leaves = laurelLeaves(50, 28, 6);

    expect(leaves).toHaveLength(12);
    expect(leaves.slice(0, 6).every((leaf) => leaf.cx <= 50)).toBe(true);
    expect(leaves.slice(6).every((leaf) => leaf.cx >= 50)).toBe(true);
  });

  it('葉が左右対称に並ぶこと', () => {
    const leaves = laurelLeaves(50, 28, 6);

    for (let index = 0; index < 6; index++) {
      const left = leaves[index];
      const right = leaves[index + 6];
      expect(left.cx - 50).toBeCloseTo(-(right.cx - 50), 5);
      expect(left.cy).toBeCloseTo(right.cy, 5);
      expect(left.rotate).toBeCloseTo(-right.rotate, 5);
    }
  });

  it('上へ向かうほど葉が小さくなること', () => {
    const leaves = laurelLeaves(50, 28, 6).slice(0, 6);

    for (let index = 1; index < leaves.length; index++) {
      expect(leaves[index].rx).toBeLessThan(leaves[index - 1].rx);
      expect(leaves[index].cy).toBeLessThan(leaves[index - 1].cy);
    }
  });

  it('葉が 1 枚でも破綻しないこと', () => {
    expect(laurelLeaves(50, 28, 1)).toHaveLength(2);
  });
});
