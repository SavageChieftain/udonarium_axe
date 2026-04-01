import { compressAsync, decompressAsync } from '@axe/core/util/compress';

describe('compress', () => {
  describe('compressAsync()', () => {
    it('Uint8Arrayを圧縮してUint8Arrayを返す', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const compressed = await compressAsync(data);
      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('大きなデータを圧縮できる', async () => {
      const data = new Uint8Array(10000);
      data.fill(65); // 'A' で埋める（圧縮しやすい）
      const compressed = await compressAsync(data);
      expect(compressed).toBeInstanceOf(Uint8Array);
      // 繰り返しデータなので圧縮後は小さくなるはず
      expect(compressed.length).toBeLessThan(data.length);
    });

    it('空のUint8Arrayを圧縮できる', async () => {
      const data = new Uint8Array(0);
      const compressed = await compressAsync(data);
      expect(compressed).toBeInstanceOf(Uint8Array);
    });

    it('chunkSizeを指定できる', async () => {
      const data = new Uint8Array(1000);
      data.fill(66);
      const compressed = await compressAsync(data, 256);
      expect(compressed).toBeInstanceOf(Uint8Array);
    });
  });

  describe('decompressAsync()', () => {
    it('圧縮データを解凍してUint8Arrayを返す', async () => {
      const original = new Uint8Array([10, 20, 30, 40, 50]);
      const compressed = await compressAsync(original);
      const decompressed = await decompressAsync(compressed);
      expect(decompressed).toEqual(original);
    });

    it('chunkSizeを指定して解凍できる', async () => {
      const original = new Uint8Array(1000);
      original.fill(67);
      const compressed = await compressAsync(original);
      const decompressed = await decompressAsync(compressed, 256);
      expect(decompressed).toEqual(original);
    });
  });

  describe('ラウンドトリップ', () => {
    it('テキストデータの圧縮/解凍ラウンドトリップ', async () => {
      const text = 'Hello, World! This is a test of compress/decompress.';
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const original = encoder.encode(text);
      const compressed = await compressAsync(original);
      const decompressed = await decompressAsync(compressed);

      expect(decoder.decode(decompressed)).toBe(text);
    });

    it('バイナリデータの圧縮/解凍ラウンドトリップ', async () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) original[i] = i;

      const compressed = await compressAsync(original);
      const decompressed = await decompressAsync(compressed);
      expect(decompressed).toEqual(original);
    });

    it('日本語テキストの圧縮/解凍ラウンドトリップ', async () => {
      const text = 'テスト日本語データの圧縮と解凍を確認します。';
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const original = encoder.encode(text);
      const compressed = await compressAsync(original);
      const decompressed = await decompressAsync(compressed);

      expect(decoder.decode(decompressed)).toBe(text);
    });
  });
});
