import * as FileReaderUtil from '@axe/core/storage/file-reader-util';

describe('FileReaderUtil', () => {
  describe('readAsArrayBufferAsync', () => {
    it('BlobをArrayBufferに変換できる', async () => {
      const blob = new Blob(['Hello World'], { type: 'text/plain' });
      const buffer = await FileReaderUtil.readAsArrayBufferAsync(blob);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(11);
    });
  });

  describe('readAsTextAsync', () => {
    it('Blobをテキストに変換できる', async () => {
      const blob = new Blob(['Test Content'], { type: 'text/plain' });
      const text = await FileReaderUtil.readAsTextAsync(blob);
      expect(text).toBe('Test Content');
    });
  });

  describe('readAsDataURLAsync', () => {
    it('Blobをdata URLに変換できる', async () => {
      const blob = new Blob(['Test'], { type: 'text/plain' });
      const dataUrl = await FileReaderUtil.readAsDataURLAsync(blob);
      expect(dataUrl).toBe('data:text/plain;base64,VGVzdA==');
    });
  });

  describe('calcSHA256Async', () => {
    it('BlobのSHA256ハッシュを計算できる', async () => {
      const blob = new Blob(['test data'], { type: 'text/plain' });
      const hash = await FileReaderUtil.calcSHA256Async(blob);
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('ArrayBufferのSHA256ハッシュを計算できる', async () => {
      const encoder = new TextEncoder();
      const buffer = encoder.encode('test data').buffer;
      const hash = await FileReaderUtil.calcSHA256Async(buffer);
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('同じデータは同じハッシュを返す', async () => {
      const blob1 = new Blob(['identical'], { type: 'text/plain' });
      const blob2 = new Blob(['identical'], { type: 'text/plain' });
      const hash1 = await FileReaderUtil.calcSHA256Async(blob1);
      const hash2 = await FileReaderUtil.calcSHA256Async(blob2);
      expect(hash1).toBe(hash2);
    });

    it('異なるデータは異なるハッシュを返す', async () => {
      const blob1 = new Blob(['data1'], { type: 'text/plain' });
      const blob2 = new Blob(['data2'], { type: 'text/plain' });
      const hash1 = await FileReaderUtil.calcSHA256Async(blob1);
      const hash2 = await FileReaderUtil.calcSHA256Async(blob2);
      expect(hash1).not.toBe(hash2);
    });
  });
});
