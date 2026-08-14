import * as FileReaderUtil from '@axe/core/storage/file-reader-util';

describe('FileReaderUtil', () => {
  describe('readAsArrayBufferAsync', () => {
    it('reads bytes into a buffer', async () => {
      const blob = new Blob(['Hello World'], { type: 'text/plain' });
      const buffer = await FileReaderUtil.readAsArrayBufferAsync(blob);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(11);
    });
  });

  describe('readAsTextAsync', () => {
    it('reads bytes as text', async () => {
      const blob = new Blob(['Test Content'], { type: 'text/plain' });
      const text = await FileReaderUtil.readAsTextAsync(blob);
      expect(text).toBe('Test Content');
    });
  });

  describe('readAsDataURLAsync', () => {
    it('reads bytes into a data url', async () => {
      const blob = new Blob(['Test'], { type: 'text/plain' });
      const dataUrl = await FileReaderUtil.readAsDataURLAsync(blob);
      expect(dataUrl).toBe('data:text/plain;base64,VGVzdA==');
    });
  });

  describe('calcSHA256Async', () => {
    it('hashes bytes', async () => {
      const blob = new Blob(['test data'], { type: 'text/plain' });
      const hash = await FileReaderUtil.calcSHA256Async(blob);
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('hashes a buffer', async () => {
      const encoder = new TextEncoder();
      const buffer = encoder.encode('test data').buffer;
      const hash = await FileReaderUtil.calcSHA256Async(buffer);
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('hashes the same data the same way', async () => {
      const blob1 = new Blob(['identical'], { type: 'text/plain' });
      const blob2 = new Blob(['identical'], { type: 'text/plain' });
      const hash1 = await FileReaderUtil.calcSHA256Async(blob1);
      const hash2 = await FileReaderUtil.calcSHA256Async(blob2);
      expect(hash1).toBe(hash2);
    });

    it('hashes different data differently', async () => {
      const blob1 = new Blob(['data1'], { type: 'text/plain' });
      const blob2 = new Blob(['data2'], { type: 'text/plain' });
      const hash1 = await FileReaderUtil.calcSHA256Async(blob1);
      const hash2 = await FileReaderUtil.calcSHA256Async(blob2);
      expect(hash1).not.toBe(hash2);
    });
  });
});
