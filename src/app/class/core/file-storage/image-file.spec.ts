import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImageFile, ImageState } from './image-file';

describe('ImageFile', () => {
  describe('ImageState enum', () => {
    it('NULL = 0', () => {
      expect(ImageState.NULL).toBe(0);
    });

    it('THUMBNAIL = 1', () => {
      expect(ImageState.THUMBNAIL).toBe(1);
    });

    it('COMPLETE = 2', () => {
      expect(ImageState.COMPLETE).toBe(2);
    });

    it('URL = 1000', () => {
      expect(ImageState.URL).toBe(1000);
    });
  });

  describe('Empty', () => {
    it('ImageFile.Emptyはシングルトン', () => {
      expect(ImageFile.Empty).toBeTruthy();
      expect(ImageFile.Empty).toBe(ImageFile.Empty);
    });

    it('EmptyのstateはNULL', () => {
      expect(ImageFile.Empty.state).toBe(ImageState.NULL);
    });

    it('Empty.isEmptyはtrue', () => {
      expect(ImageFile.Empty.isEmpty).toBe(true);
    });
  });

  describe('createEmpty', () => {
    it('空のImageFileを作成できる', () => {
      const img = ImageFile.createEmpty('test-id');
      expect(img.identifier).toBe('test-id');
      expect(img.isEmpty).toBe(true);
      expect(img.state).toBe(ImageState.NULL);
    });
  });

  describe('create (URL)', () => {
    it('URLからImageFileを作成できる', () => {
      const img = ImageFile.create('https://example.com/image.png');
      expect(img.identifier).toBe('https://example.com/image.png');
      expect(img.name).toBe('https://example.com/image.png');
      expect(img.url).toBe('https://example.com/image.png');
      expect(img.state).toBe(ImageState.URL);
    });
  });

  describe('create (context)', () => {
    it('コンテキストからImageFileを作成できる', () => {
      const img = ImageFile.create({
        identifier: 'ctx-id',
        name: 'test.png',
        type: 'image/png',
        blob: null,
        url: '',
        thumbnail: { type: '', blob: null, url: '' },
      });
      expect(img.identifier).toBe('ctx-id');
      expect(img.name).toBe('test.png');
    });
  });

  describe('toContext', () => {
    it('ImageContextを返す', () => {
      const img = ImageFile.create('https://example.com/test.png');
      const ctx = img.toContext();
      expect(ctx.identifier).toBe('https://example.com/test.png');
      expect(ctx.name).toBe('https://example.com/test.png');
      expect(ctx.url).toBe('https://example.com/test.png');
    });
  });

  describe('state', () => {
    it('blob/url両方なしでNULL', () => {
      const img = ImageFile.createEmpty('empty');
      expect(img.state).toBe(ImageState.NULL);
    });

    it('urlのみでURL', () => {
      const img = ImageFile.create('https://example.com/img.jpg');
      expect(img.state).toBe(ImageState.URL);
    });
  });

  describe('apply', () => {
    it('空コンテキストに値を適用できる', () => {
      const img = ImageFile.createEmpty('');
      img.apply({
        identifier: 'new-id',
        name: 'applied.png',
        type: 'image/png',
        blob: null,
        url: '',
        thumbnail: { type: '', blob: null, url: '' },
      });
      expect(img.identifier).toBe('new-id');
      expect(img.name).toBe('applied.png');
    });
  });
});
