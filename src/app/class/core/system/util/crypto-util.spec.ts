import { describe, it, expect } from 'vitest';
import { CryptoUtil } from './crypto-util';

describe('CryptoUtil', () => {
  describe('sha256()', () => {
    it('should hash string input', () => {
      const result = CryptoUtil.sha256('test');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32); // SHA256 produces 32 bytes
    });

    it('should hash ArrayBuffer input', () => {
      const buffer = new TextEncoder().encode('test').buffer;
      const result = CryptoUtil.sha256(buffer);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should produce same hash for same string', () => {
      const hash1 = CryptoUtil.sha256('test');
      const hash2 = CryptoUtil.sha256('test');

      expect(hash1).toEqual(hash2);
    });

    it('should produce different hash for different strings', () => {
      const hash1 = CryptoUtil.sha256('test1');
      const hash2 = CryptoUtil.sha256('test2');

      expect(hash1).not.toEqual(hash2);
    });

    it('should handle empty string', () => {
      const result = CryptoUtil.sha256('');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should handle empty ArrayBuffer', () => {
      const buffer = new ArrayBuffer(0);
      const result = CryptoUtil.sha256(buffer);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should produce deterministic output', () => {
      const input = 'Hello, World!';
      const hash1 = CryptoUtil.sha256(input);
      const hash2 = CryptoUtil.sha256(input);
      const hash3 = CryptoUtil.sha256(input);

      expect(hash1).toEqual(hash2);
      expect(hash2).toEqual(hash3);
    });

    it('should handle unicode characters', () => {
      const result = CryptoUtil.sha256('日本語テスト');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = CryptoUtil.sha256(longString);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should produce same hash for string and buffer with same content', () => {
      const text = 'test';
      const buffer = new TextEncoder().encode(text).buffer;

      const hashFromString = CryptoUtil.sha256(text);
      const hashFromBuffer = CryptoUtil.sha256(buffer);

      expect(hashFromString).toEqual(hashFromBuffer);
    });
  });

  describe('sha256Hex()', () => {
    it('should return hex string from string input', () => {
      const result = CryptoUtil.sha256Hex('test');

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-f]{64}$/); // SHA256 hex is 64 characters
    });

    it('should return hex string from ArrayBuffer input', () => {
      const buffer = new TextEncoder().encode('test').buffer;
      const result = CryptoUtil.sha256Hex(buffer);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce same hex for same input', () => {
      const hex1 = CryptoUtil.sha256Hex('test');
      const hex2 = CryptoUtil.sha256Hex('test');

      expect(hex1).toBe(hex2);
    });

    it('should produce different hex for different inputs', () => {
      const hex1 = CryptoUtil.sha256Hex('test1');
      const hex2 = CryptoUtil.sha256Hex('test2');

      expect(hex1).not.toBe(hex2);
    });

    it('should produce known hash for known input', () => {
      const result = CryptoUtil.sha256Hex('');

      // SHA256 of empty string is known value
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle empty string', () => {
      const result = CryptoUtil.sha256Hex('');

      expect(typeof result).toBe('string');
      expect(result.length).toBe(64);
    });

    it('should produce lowercase hex', () => {
      const result = CryptoUtil.sha256Hex('test');

      expect(result).toBe(result.toLowerCase());
    });

    it('should produce same hex for string and buffer with same content', () => {
      const text = 'test';
      const buffer = new TextEncoder().encode(text).buffer;

      const hexFromString = CryptoUtil.sha256Hex(text);
      const hexFromBuffer = CryptoUtil.sha256Hex(buffer);

      expect(hexFromString).toBe(hexFromBuffer);
    });
  });

  describe('sha256Base64Url()', () => {
    it('should return base64url string', () => {
      const result = CryptoUtil.sha256Base64Url('test');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should not contain standard base64 characters (+, /, =)', () => {
      const result = CryptoUtil.sha256Base64Url('test');

      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('should use URL-safe characters (- and _)', () => {
      // Generate enough hashes to likely hit edge cases
      const inputs = Array.from({ length: 100 }, (_, i) => `test${i}`);
      const allResults = inputs.map((input) => CryptoUtil.sha256Base64Url(input)).join('');

      // Should only contain base64url characters: A-Z, a-z, 0-9, -, _
      expect(allResults).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should produce same output for same input', () => {
      const result1 = CryptoUtil.sha256Base64Url('test');
      const result2 = CryptoUtil.sha256Base64Url('test');

      expect(result1).toBe(result2);
    });

    it('should produce different output for different inputs', () => {
      const result1 = CryptoUtil.sha256Base64Url('test1');
      const result2 = CryptoUtil.sha256Base64Url('test2');

      expect(result1).not.toBe(result2);
    });

    it('should handle empty string', () => {
      const result = CryptoUtil.sha256Base64Url('');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null input', () => {
      const result = CryptoUtil.sha256Base64Url(null as any);

      expect(result).toBe('');
    });

    it('should handle unicode characters', () => {
      const result = CryptoUtil.sha256Base64Url('日本語');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should produce consistent length output', () => {
      const result1 = CryptoUtil.sha256Base64Url('short');
      const result2 = CryptoUtil.sha256Base64Url('a'.repeat(1000));

      // Base64Url encoding of SHA256 should have consistent length
      expect(result1.length).toBe(result2.length);
    });

    it('should be URL-safe', () => {
      const result = CryptoUtil.sha256Base64Url('test');
      const encoded = encodeURIComponent(result);

      // URL-safe base64 should not change when URL encoded
      expect(encoded).toBe(result);
    });
  });

  describe('integration', () => {
    it('should produce consistent hashes across all methods for same input', () => {
      const input = 'test';
      const buffer = new TextEncoder().encode(input).buffer;

      const uint8FromString = CryptoUtil.sha256(input);
      const uint8FromBuffer = CryptoUtil.sha256(buffer);
      const hexFromString = CryptoUtil.sha256Hex(input);
      const hexFromBuffer = CryptoUtil.sha256Hex(buffer);

      // Convert uint8 to hex for comparison
      const hexFromUint8String = Array.from(uint8FromString)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const hexFromUint8Buffer = Array.from(uint8FromBuffer)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      expect(hexFromUint8String).toBe(hexFromString);
      expect(hexFromUint8Buffer).toBe(hexFromBuffer);
      expect(hexFromString).toBe(hexFromBuffer);
    });

    it('should handle special characters consistently', () => {
      const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const hash1 = CryptoUtil.sha256Hex(special);
      const hash2 = CryptoUtil.sha256Hex(special);

      expect(hash1).toBe(hash2);
    });

    it('should be fast enough for typical use', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        CryptoUtil.sha256Hex(`test${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should hash 1000 strings in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
