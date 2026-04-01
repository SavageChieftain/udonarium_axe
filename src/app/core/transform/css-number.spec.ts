import { CSSNumber } from '@axe/core/transform/css-number';

describe('CSSNumber', () => {
  describe('parse()', () => {
    it('数値文字列をパースする', () => {
      expect(CSSNumber.parse('42')).toBe(42);
    });

    it('小数をパースする', () => {
      expect(CSSNumber.parse('3.14')).toBeCloseTo(3.14);
    });

    it('NaNの場合デフォルト値を返す', () => {
      expect(CSSNumber.parse('abc')).toBe(0);
    });

    it('カスタムデフォルト値を返す', () => {
      expect(CSSNumber.parse('abc', 99)).toBe(99);
    });

    it('nullの場合デフォルト値を返す', () => {
      expect(CSSNumber.parse(null)).toBe(0);
    });
  });

  describe('relation()', () => {
    it('数値をそのまま返す', () => {
      expect(CSSNumber.relation(100, 500)).toBe(100);
    });

    it('px単位をパースする', () => {
      expect(CSSNumber.relation('50px', 500)).toBe(50);
    });

    it('pt単位をパースする', () => {
      expect(CSSNumber.relation('30pt', 500)).toBe(30);
    });

    it('pt単位は小数もパースする', () => {
      expect(CSSNumber.relation('1.5pt', 500)).toBeCloseTo(1.5);
    });

    it('%単位をrelativeSizeに基づいて計算する', () => {
      expect(CSSNumber.relation('50%', 200)).toBe(100);
    });

    it('em単位をパースする', () => {
      expect(CSSNumber.relation('2em', 500)).toBe(2);
    });

    it('"top"は0を返す', () => {
      expect(CSSNumber.relation('top', 500)).toBe(0);
    });

    it('"left"は0を返す', () => {
      expect(CSSNumber.relation('left', 500)).toBe(0);
    });

    it('"center"はrelativeSizeの半分を返す', () => {
      expect(CSSNumber.relation('center', 400)).toBe(200);
    });

    it('"middle"はrelativeSizeの半分を返す', () => {
      expect(CSSNumber.relation('middle', 400)).toBe(200);
    });

    it('"bottom"はrelativeSizeを返す', () => {
      expect(CSSNumber.relation('bottom', 500)).toBe(500);
    });

    it('"right"はrelativeSizeを返す', () => {
      expect(CSSNumber.relation('right', 500)).toBe(500);
    });

    it('nullの場合デフォルト値を返す', () => {
      expect(CSSNumber.relation(null, 500)).toBe(0);
    });

    it('undefinedの場合デフォルト値を返す', () => {
      expect(CSSNumber.relation(undefined, 500)).toBe(0);
    });

    it('カスタムデフォルト値を返す', () => {
      expect(CSSNumber.relation(null, 500, 42)).toBe(42);
    });

    it('認識できない文字列はデフォルト値を返す', () => {
      expect(CSSNumber.relation('unknown', 500)).toBe(0);
    });
  });
});
