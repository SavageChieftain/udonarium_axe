import { Segment } from '@axe/domain/tabletop/los/segments';
import { computeVisibilityPolygon } from '@axe/domain/tabletop/los/visibility-polygon';

describe('los/visibility-polygon', () => {
  it('returns a full circle at the maximum radius with no walls', () => {
    const polygon = computeVisibilityPolygon(0, 0, [], 100, 8);
    expect(polygon.length).toBeGreaterThanOrEqual(8);
    for (const p of polygon) {
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(100 + 1e-6);
    }
  });

  it('stops a ray at the wall it meets', () => {
    const wall: Segment[] = [{ x1: 100, y1: -100, x2: 100, y2: 100 }];
    const polygon = computeVisibilityPolygon(0, 0, wall, 1000, 8);
    const straightRight = polygon.find((p) => Math.abs(p.y) < 1 && p.x > 0);
    expect(straightRight).toBeTruthy();
    expect(straightRight!.x).toBeCloseTo(100, 1);
  });

  it('leaves what is behind the wall short of that radius, which is the shadow', () => {
    const wall: Segment[] = [{ x1: 100, y1: -100, x2: 100, y2: 100 }];
    const polygon = computeVisibilityPolygon(0, 0, wall, 1000, 64);
    const farRight = polygon.filter((p) => p.x > 150 && Math.abs(p.y) < 50);
    expect(farRight).toHaveLength(0);
  });
});
