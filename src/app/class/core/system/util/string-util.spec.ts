import { describe, it, expect } from 'vitest';
import { StringUtil } from './string-util';

describe('StringUtil', () => {
  describe('toHalfWidth()', () => {
    it('should convert full-width alphanumeric to half-width', () => {
      const result = StringUtil.toHalfWidth('ＡＢＣ１２３');

      expect(result).toBe('ABC123');
    });

    it('should convert full-width symbols to half-width', () => {
      const result = StringUtil.toHalfWidth('！＠＃＄％');

      expect(result).toBe('!@#$%');
    });

    it('should handle empty string', () => {
      const result = StringUtil.toHalfWidth('');

      expect(result).toBe('');
    });

    it('should not modify half-width characters', () => {
      const input = 'ABC123!@#';
      const result = StringUtil.toHalfWidth(input);

      expect(result).toBe(input);
    });

    it('should convert full-width lowercase letters', () => {
      const result = StringUtil.toHalfWidth('ａｂｃｄｅｆ');

      expect(result).toBe('abcdef');
    });

    it('should convert full-width uppercase letters', () => {
      const result = StringUtil.toHalfWidth('ＡＢＣＤＥＦ');

      expect(result).toBe('ABCDEF');
    });

    it('should convert full-width numbers', () => {
      const result = StringUtil.toHalfWidth('０１２３４５６７８９');

      expect(result).toBe('0123456789');
    });

    it('should convert full-width punctuation', () => {
      const result = StringUtil.toHalfWidth('：；，．？');

      expect(result).toBe(':;,.?');
    });

    it('should convert full-width brackets', () => {
      const result = StringUtil.toHalfWidth('（）［］｛｝');

      expect(result).toBe('()[]{}');
    });

    it('should handle mixed full-width and half-width', () => {
      const result = StringUtil.toHalfWidth('ABCアイウ１２３あいう');

      expect(result).toBe('ABCアイウ123あいう');
    });

    it('should not modify hiragana', () => {
      const input = 'あいうえお';
      const result = StringUtil.toHalfWidth(input);

      expect(result).toBe(input);
    });

    it('should not modify katakana', () => {
      const input = 'アイウエオ';
      const result = StringUtil.toHalfWidth(input);

      expect(result).toBe(input);
    });

    it('should not modify kanji', () => {
      const input = '漢字変換';
      const result = StringUtil.toHalfWidth(input);

      expect(result).toBe(input);
    });

    it('should not convert full-width space (outside range)', () => {
      const input = '　';
      const result = StringUtil.toHalfWidth(input);

      // Full-width space (U+3000) is outside the conversion range
      expect(result).toBe(input);
    });

    it('should handle string with only full-width characters', () => {
      const result = StringUtil.toHalfWidth('ＡＢＣＤＥＦ１２３４５６');

      expect(result).toBe('ABCDEF123456');
    });

    it('should convert mathematical operators', () => {
      const result = StringUtil.toHalfWidth('＋－×÷＝');

      expect(result).toBe('+-×÷=');
    });

    it('should handle complex mixed string', () => {
      const result = StringUtil.toHalfWidth('テスト：Test＝１２３');

      expect(result).toBe('テスト:Test=123');
    });

    it('should be idempotent (calling twice gives same result)', () => {
      const input = 'ＡＢＣ１２３';
      const result1 = StringUtil.toHalfWidth(input);
      const result2 = StringUtil.toHalfWidth(result1);

      expect(result1).toBe(result2);
      expect(result2).toBe('ABC123');
    });

    it('should handle string with newlines and tabs', () => {
      const result = StringUtil.toHalfWidth('ＡＢＣ\n１２３\tＸＹＺ');

      expect(result).toBe('ABC\n123\tXYZ');
    });

    it('should convert full-width quotation marks', () => {
      const result = StringUtil.toHalfWidth('＂＇');

      expect(result).toBe('"\'');
    });

    it('should handle very long strings', () => {
      const fullWidth = 'ＡＢＣＤＥＦ１２３４５６'.repeat(100);
      const expected = 'ABCDEF123456'.repeat(100);

      const result = StringUtil.toHalfWidth(fullWidth);

      expect(result).toBe(expected);
      expect(result.length).toBe(expected.length);
    });
  });
});
