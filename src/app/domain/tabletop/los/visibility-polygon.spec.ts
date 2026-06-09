import { Segment } from '@axe/domain/tabletop/los/segments';
import { computeVisibilityPolygon } from '@axe/domain/tabletop/los/visibility-polygon';

describe('los/visibility-polygon', () => {
  it('壁が無ければ maxRadius のサンプル円を返す', () => {
    const polygon = computeVisibilityPolygon(0, 0, [], 100, 8);
    expect(polygon.length).toBeGreaterThanOrEqual(8);
    for (const p of polygon) {
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(100 + 1e-6);
    }
  });

  it('壁に向かうレイは壁の距離で止まる', () => {
    const wall: Segment[] = [{ x1: 100, y1: -100, x2: 100, y2: 100 }];
    const polygon = computeVisibilityPolygon(0, 0, wall, 1000, 8);
    const straightRight = polygon.find((p) => Math.abs(p.y) < 1 && p.x > 0);
    expect(straightRight).toBeTruthy();
    expect(straightRight!.x).toBeCloseTo(100, 1);
  });

  it('壁の向こう側は maxRadius まで届かない（影ができる）', () => {
    const wall: Segment[] = [{ x1: 100, y1: -100, x2: 100, y2: 100 }];
    const polygon = computeVisibilityPolygon(0, 0, wall, 1000, 64);
    const farRight = polygon.filter((p) => p.x > 150 && Math.abs(p.y) < 50);
    expect(farRight).toHaveLength(0);
  });
});
