import { perimeterSegments, rectangleSegments, segmentClear, segmentsCross } from '@axe/domain/tabletop/los/segments';

describe('los/segments', () => {
  describe('rectangleSegments', () => {
    it('回転なしの矩形は4辺を返す', () => {
      const segments = rectangleSegments(0, 0, 100, 100, 0);
      expect(segments).toHaveLength(4);
      expect(segments[0]).toEqual({ x1: 0, y1: 0, x2: 100, y2: 0 });
      expect(segments[2]).toEqual({ x1: 100, y1: 100, x2: 0, y2: 100 });
    });

    it('回転すると角が中心周りに動く', () => {
      const segments = rectangleSegments(0, 0, 100, 20, 90);
      const xs = segments.map((s) => s.x1);
      const ys = segments.map((s) => s.y1);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(20);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(100);
    });
  });

  describe('perimeterSegments', () => {
    it('テーブル外周の4辺を返す', () => {
      expect(perimeterSegments(1000, 800)).toHaveLength(4);
    });
  });

  describe('segmentsCross', () => {
    it('交差する線分は true', () => {
      expect(segmentsCross(0, 0, 100, 0, 50, -50, 50, 50)).toBe(true);
    });
    it('交差しない線分は false', () => {
      expect(segmentsCross(0, 0, 100, 0, 0, 50, 100, 50)).toBe(false);
    });
    it('端点で触れるだけ(T字)は false', () => {
      expect(segmentsCross(0, 0, 100, 0, 50, 0, 50, 50)).toBe(false);
    });
  });

  describe('segmentClear', () => {
    const wall = [{ x1: 50, y1: -50, x2: 50, y2: 50 }];
    it('間に壁があると遮蔽', () => {
      expect(segmentClear(0, 0, 100, 0, wall)).toBe(false);
    });
    it('壁を跨がなければ通る', () => {
      expect(segmentClear(0, 0, 0, 100, wall)).toBe(true);
    });
    it('壁が無ければ常に通る', () => {
      expect(segmentClear(0, 0, 100, 0, [])).toBe(true);
    });
  });
});
