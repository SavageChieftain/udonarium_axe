import { sha256, sha256Base64Url, sha256Hex } from '@axe/core/util/crypto-util';

describe('CryptoUtil', () => {
  describe('sha256()', () => {
    it('should hash string input', async () => {
      const result = await sha256('test');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should hash ArrayBuffer input', async () => {
      const buffer = new TextEncoder().encode('test').buffer;
      const result = await sha256(buffer);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should produce same hash for same string', async () => {
      const hash1 = await sha256('test');
      const hash2 = await sha256('test');

      expect(hash1).toEqual(hash2);
    });

    it('should produce different hash for different strings', async () => {
      const hash1 = await sha256('test1');
      const hash2 = await sha256('test2');

      expect(hash1).not.toEqual(hash2);
    });

    it('should handle empty string', async () => {
      const result = await sha256('');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should handle empty ArrayBuffer', async () => {
      const buffer = new ArrayBuffer(0);
      const result = await sha256(buffer);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should produce deterministic output', async () => {
      const input = 'Hello, World!';
      const hash1 = await sha256(input);
      const hash2 = await sha256(input);
      const hash3 = await sha256(input);

      expect(hash1).toEqual(hash2);
      expect(hash2).toEqual(hash3);
    });

    it('should handle unicode characters', async () => {
      const result = await sha256('日本語テスト');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(10000);
      const result = await sha256(longString);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should produce same hash for string and buffer with same content', async () => {
      const text = 'test';
      const buffer = new TextEncoder().encode(text).buffer;

      const hashFromString = await sha256(text);
      const hashFromBuffer = await sha256(buffer);

      expect(hashFromString).toEqual(hashFromBuffer);
    });
  });

  describe('sha256Hex()', () => {
    it('should return hex string from string input', async () => {
      const result = await sha256Hex('test');

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return hex string from ArrayBuffer input', async () => {
      const buffer = new TextEncoder().encode('test').buffer;
      const result = await sha256Hex(buffer);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce same hex for same input', async () => {
      const hex1 = await sha256Hex('test');
      const hex2 = await sha256Hex('test');

      expect(hex1).toBe(hex2);
    });

    it('should produce different hex for different inputs', async () => {
      const hex1 = await sha256Hex('test1');
      const hex2 = await sha256Hex('test2');

      expect(hex1).not.toBe(hex2);
    });

    it('should produce known hash for known input', async () => {
      const result = await sha256Hex('');

      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle empty string', async () => {
      const result = await sha256Hex('');

      expect(typeof result).toBe('string');
      expect(result.length).toBe(64);
    });

    it('should produce lowercase hex', async () => {
      const result = await sha256Hex('test');

      expect(result).toBe(result.toLowerCase());
    });

    it('should produce same hex for string and buffer with same content', async () => {
      const text = 'test';
      const buffer = new TextEncoder().encode(text).buffer;

      const hexFromString = await sha256Hex(text);
      const hexFromBuffer = await sha256Hex(buffer);

      expect(hexFromString).toBe(hexFromBuffer);
    });
  });

  describe('sha256Base64Url()', () => {
    it('should return base64url string', async () => {
      const result = await sha256Base64Url('test');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should not contain standard base64 characters (+, /, =)', async () => {
      const result = await sha256Base64Url('test');

      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('should use URL-safe characters (- and _)', async () => {
      const inputs = Array.from({ length: 100 }, (_, i) => `test${i}`);
      const results = await Promise.all(inputs.map((input) => sha256Base64Url(input)));
      const allResults = results.join('');

      expect(allResults).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should produce same output for same input', async () => {
      const result1 = await sha256Base64Url('test');
      const result2 = await sha256Base64Url('test');

      expect(result1).toBe(result2);
    });

    it('should produce different output for different inputs', async () => {
      const result1 = await sha256Base64Url('test1');
      const result2 = await sha256Base64Url('test2');

      expect(result1).not.toBe(result2);
    });

    it('should handle empty string', async () => {
      const result = await sha256Base64Url('');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null input', async () => {
      const result = await sha256Base64Url(null as unknown as string);

      expect(result).toBe('');
    });

    it('should handle unicode characters', async () => {
      const result = await sha256Base64Url('日本語');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should produce consistent length output', async () => {
      const result1 = await sha256Base64Url('short');
      const result2 = await sha256Base64Url('a'.repeat(1000));

      expect(result1.length).toBe(result2.length);
    });

    it('should be URL-safe', async () => {
      const result = await sha256Base64Url('test');
      const encoded = encodeURIComponent(result);

      expect(encoded).toBe(result);
    });
  });

  describe('integration', () => {
    it('should produce consistent hashes across all methods for same input', async () => {
      const input = 'test';
      const buffer = new TextEncoder().encode(input).buffer;

      const uint8FromString = await sha256(input);
      const uint8FromBuffer = await sha256(buffer);
      const hexFromString = await sha256Hex(input);
      const hexFromBuffer = await sha256Hex(buffer);

      const hexFromUint8String = Array.from(uint8FromString)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
      const hexFromUint8Buffer = Array.from(uint8FromBuffer)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');

      expect(hexFromUint8String).toBe(hexFromString);
      expect(hexFromUint8Buffer).toBe(hexFromBuffer);
      expect(hexFromString).toBe(hexFromBuffer);
    });

    it('should handle special characters consistently', async () => {
      const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const hash1 = await sha256Hex(special);
      const hash2 = await sha256Hex(special);

      expect(hash1).toBe(hash2);
    });

    it('should be fast enough for typical use', async () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        await sha256Hex(`test${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});
