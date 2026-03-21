import { describe, it, expect } from 'vitest';
import { base } from './base-x';

describe('base-x', () => {
  const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE16_ALPHABET = '0123456789abcdef';

  describe('base() ファクトリ', () => {
    it('BaseConverterオブジェクトを返す', () => {
      const converter = base(BASE58_ALPHABET);
      expect(converter).toBeTruthy();
      expect(typeof converter.encode).toBe('function');
      expect(typeof converter.decode).toBe('function');
      expect(typeof converter.decodeUnsafe).toBe('function');
    });
  });

  describe('base16 (hex)', () => {
    const hex = base(BASE16_ALPHABET);

    it('バイト配列をエンコードする', () => {
      const result = hex.encode(new Uint8Array([0xff]));
      expect(result).toBe('ff');
    });

    it('エンコード→デコードのラウンドトリップ', () => {
      const original = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab]);
      const encoded = hex.encode(original);
      const decoded = hex.decode(encoded);
      expect(decoded).toEqual(original);
    });

    it('先頭の0バイトが保持される', () => {
      const data = new Uint8Array([0, 0, 1]);
      const encoded = hex.encode(data);
      expect(encoded.startsWith('00')).toBe(true);
      const decoded = hex.decode(encoded);
      expect(decoded).toEqual(data);
    });
  });

  describe('base58', () => {
    const b58 = base(BASE58_ALPHABET);

    it('バイト配列をエンコードする', () => {
      const result = b58.encode(new Uint8Array([0, 0, 0, 1]));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('エンコード→デコードのラウンドトリップ', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const encoded = b58.encode(original);
      const decoded = b58.decode(encoded);
      expect(decoded).toEqual(original);
    });

    it('空のバイト配列をエンコードすると空文字列', () => {
      const result = b58.encode(new Uint8Array([]));
      expect(result).toBe('');
    });

    it('空文字列をデコードすると空のUint8Array', () => {
      const result = b58.decode('');
      expect(result).toEqual(new Uint8Array([]));
    });

    it('先頭の0バイトが1にマッピングされる', () => {
      const data = new Uint8Array([0, 0, 1]);
      const encoded = b58.encode(data);
      // base58で0バイトはアルファベット先頭文字'1'
      expect(encoded.startsWith('11')).toBe(true);
    });
  });

  describe('decodeUnsafe()', () => {
    const b58 = base(BASE58_ALPHABET);

    it('有効な文字列をデコードする', () => {
      const original = new Uint8Array([1, 2, 3]);
      const encoded = b58.encode(original);
      const decoded = b58.decodeUnsafe(encoded);
      expect(decoded).toEqual(original);
    });

    it('無効な文字を含む文字列でundefinedを返す', () => {
      const result = b58.decodeUnsafe('invalid0character');
      expect(result).toBeUndefined();
    });
  });

  describe('decode() エラー', () => {
    const b58 = base(BASE58_ALPHABET);

    it('無効な文字を含む文字列でエラーを投げる', () => {
      expect(() => b58.decode('invalid0character')).toThrow();
    });
  });

  describe('number配列入力', () => {
    const b58 = base(BASE58_ALPHABET);

    it('number配列もエンコードできる', () => {
      const data = [1, 2, 3, 4, 5];
      const encoded = b58.encode(data);
      expect(typeof encoded).toBe('string');
      const decoded = b58.decode(encoded);
      expect(decoded).toEqual(new Uint8Array(data));
    });
  });
});
