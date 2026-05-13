import { clampInRange, floatOr, roundOr } from '@axe/features/character/game-character-sheet/numeric-input-helpers';

describe('numeric-input-helpers', () => {
  describe('floatOr()', () => {
    it('有限値はそのまま返す', () => {
      expect(floatOr(3.14, 0)).toBe(3.14);
      expect(floatOr(-2.5, 0)).toBe(-2.5);
      expect(floatOr(0, 1)).toBe(0);
    });

    it('NaN / Infinity は fallback', () => {
      expect(floatOr(NaN, 7)).toBe(7);
      expect(floatOr(Infinity, 7)).toBe(7);
      expect(floatOr(-Infinity, 7)).toBe(7);
    });
  });

  describe('roundOr()', () => {
    it('有限値は Math.round 結果', () => {
      expect(roundOr(3.4, 0)).toBe(3);
      expect(roundOr(3.5, 0)).toBe(4);
      expect(roundOr(-2.5, 0)).toBe(-2); // banker's rounding ではなく Math.round 仕様
    });

    it('無効値は fallback', () => {
      expect(roundOr(NaN, 0)).toBe(0);
      expect(roundOr(Infinity, 99)).toBe(99);
    });
  });

  describe('clampInRange()', () => {
    it('範囲内ならそのまま', () => {
      expect(clampInRange(50, 0, 100, 0)).toBe(50);
    });

    it('範囲下を下回ったら min', () => {
      expect(clampInRange(-5, 0, 100, 999)).toBe(0);
    });

    it('範囲上を上回ったら max', () => {
      expect(clampInRange(150, 0, 100, 999)).toBe(100);
    });

    it('NaN / Infinity は fallback', () => {
      expect(clampInRange(NaN, 0, 100, 50)).toBe(50);
      expect(clampInRange(Infinity, 0, 100, 50)).toBe(50);
    });

    it('境界値は範囲内扱い', () => {
      expect(clampInRange(0, 0, 100, 999)).toBe(0);
      expect(clampInRange(100, 0, 100, 999)).toBe(100);
    });
  });
});
