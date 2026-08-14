import { CSSNumber } from '@axe/core/transform/css-number';

describe('CSSNumber', () => {
  describe('parse()', () => {
    it('reads a numeric string', () => {
      expect(CSSNumber.parse('42')).toBe(42);
    });

    it('reads a decimal', () => {
      expect(CSSNumber.parse('3.14')).toBeCloseTo(3.14);
    });

    it('falls back to the default for a number that is not one', () => {
      expect(CSSNumber.parse('abc')).toBe(0);
    });

    it('takes the default it is given', () => {
      expect(CSSNumber.parse('abc', 99)).toBe(99);
    });

    it('falls back to the default for null', () => {
      expect(CSSNumber.parse(null)).toBe(0);
    });
  });

  describe('relation()', () => {
    it('returns a number unchanged', () => {
      expect(CSSNumber.relation(100, 500)).toBe(100);
    });

    it('reads a length in pixels', () => {
      expect(CSSNumber.relation('50px', 500)).toBe(50);
    });

    it('reads a length in points', () => {
      expect(CSSNumber.relation('30pt', 500)).toBe(30);
    });

    it('reads a fractional length in points', () => {
      expect(CSSNumber.relation('1.5pt', 500)).toBeCloseTo(1.5);
    });

    it('reads a percentage against the size it is relative to', () => {
      expect(CSSNumber.relation('50%', 200)).toBe(100);
    });

    it('reads a length in ems', () => {
      expect(CSSNumber.relation('2em', 500)).toBe(2);
    });

    it('reads top as zero', () => {
      expect(CSSNumber.relation('top', 500)).toBe(0);
    });

    it('reads left as zero', () => {
      expect(CSSNumber.relation('left', 500)).toBe(0);
    });

    it('reads centre as half the relative size', () => {
      expect(CSSNumber.relation('center', 400)).toBe(200);
    });

    it('reads middle as half the relative size', () => {
      expect(CSSNumber.relation('middle', 400)).toBe(200);
    });

    it('reads bottom as the whole relative size', () => {
      expect(CSSNumber.relation('bottom', 500)).toBe(500);
    });

    it('reads right as the whole relative size', () => {
      expect(CSSNumber.relation('right', 500)).toBe(500);
    });

    it('falls back to the default for null', () => {
      expect(CSSNumber.relation(null, 500)).toBe(0);
    });

    it('falls back to the default for nothing at all', () => {
      expect(CSSNumber.relation(undefined, 500)).toBe(0);
    });

    it('takes the default it is given', () => {
      expect(CSSNumber.relation(null, 500, 42)).toBe(42);
    });

    it('falls back to the default for a string it cannot read', () => {
      expect(CSSNumber.relation('unknown', 500)).toBe(0);
    });
  });
});
