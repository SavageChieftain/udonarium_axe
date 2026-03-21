import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Base64 } from './base64';

describe('Base64', () => {
  describe('toBlob', () => {
    it('base64文字列からBlobを作成できる', () => {
      // "Hello" をbase64エンコード
      const base64 = 'data:text/plain;base64,SGVsbG8=';
      const blob = Base64.toBlob(base64);
      expect(blob).toBeTruthy();
      expect(blob.type).toBe('text/plain');
      expect(blob.size).toBe(5);
    });

    it('不正なbase64はnullを返す', () => {
      const blob = Base64.toBlob('invalid,!!!');
      expect(blob).toBeFalsy();
    });

    it('MIMEタイプが空の場合nullを返す', () => {
      const blob = Base64.toBlob('data:;base64,SGVsbG8=');
      expect(blob).toBeFalsy();
    });

    it('画像のbase64をBlobに変換できる', () => {
      // 1x1 白いPNG
      const base64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const blob = Base64.toBlob(base64);
      expect(blob).toBeTruthy();
      expect(blob.type).toBe('image/png');
    });
  });

  describe('toBase64Async', () => {
    it('BlobをBase64文字列に変換できる', async () => {
      const blob = new Blob(['Hello'], { type: 'text/plain' });
      const result = await Base64.toBase64Async(blob);
      expect(result).toContain('data:text/plain');
      expect(result).toContain('base64');
    });
  });
});
