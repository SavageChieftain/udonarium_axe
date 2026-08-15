import { perimeterSegments, rectangleSegments, segmentClear, segmentsCross } from '@axe/domain/tabletop/los/segments';

describe('los/segments', () => {
  describe('rectangleSegments', () => {
    it('returns the four sides of an unturned rectangle', () => {
      const segments = rectangleSegments(0, 0, 100, 100, 0);
      expect(segments).toHaveLength(4);
      expect(segments[0]).toEqual({ x1: 0, y1: 0, x2: 100, y2: 0 });
      expect(segments[2]).toEqual({ x1: 100, y1: 100, x2: 0, y2: 100 });
    });

    it('swings the corners about the centre as it turns', () => {
      const segments = rectangleSegments(0, 0, 100, 20, 90);
      const xs = segments.map((s) => s.x1);
      const ys = segments.map((s) => s.y1);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(20);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(100);
    });
  });

  describe('perimeterSegments', () => {
    it('returns the four sides of the table', () => {
      expect(perimeterSegments(1000, 800)).toHaveLength(4);
    });
  });

  describe('segmentsCross', () => {
    it('is true for two segments that cross', () => {
      expect(segmentsCross(0, 0, 100, 0, 50, -50, 50, 50)).toBe(true);
    });
    it('is false for two that do not', () => {
      expect(segmentsCross(0, 0, 100, 0, 0, 50, 100, 50)).toBe(false);
    });
    it('is false where one only touches the end of the other', () => {
      expect(segmentsCross(0, 0, 100, 0, 50, 0, 50, 50)).toBe(false);
    });
  });

  describe('segmentClear', () => {
    const wall = [{ x1: 50, y1: -50, x2: 50, y2: 50 }];
    it('is blocked by a wall between them', () => {
      expect(segmentClear(0, 0, 100, 0, wall)).toBe(false);
    });
    it('passes where no wall stands between', () => {
      expect(segmentClear(0, 0, 0, 100, wall)).toBe(true);
    });
    it('always passes with no walls at all', () => {
      expect(segmentClear(0, 0, 100, 0, [])).toBe(true);
    });
  });
});
