import { ImageFile, ImageState } from '@axe/core/storage/image-file';

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
    it('the empty image is a singleton', () => {
      expect(ImageFile.Empty).toBeTruthy();
      expect(ImageFile.Empty).toBe(ImageFile.Empty);
    });

    it('the empty image holds nothing', () => {
      expect(ImageFile.Empty.state).toBe(ImageState.NULL);
    });

    it('the empty image knows it is empty', () => {
      expect(ImageFile.Empty.isEmpty).toBe(true);
    });
  });

  describe('createEmpty', () => {
    it('builds an empty image', () => {
      const img = ImageFile.createEmpty('test-id');
      expect(img.identifier).toBe('test-id');
      expect(img.isEmpty).toBe(true);
      expect(img.state).toBe(ImageState.NULL);
    });
  });

  describe('create (URL)', () => {
    it('builds an image from a url', () => {
      const img = ImageFile.create('https://example.com/image.png');
      expect(img.identifier).toBe('https://example.com/image.png');
      expect(img.name).toBe('https://example.com/image.png');
      expect(img.url).toBe('https://example.com/image.png');
      expect(img.state).toBe(ImageState.URL);
    });
  });

  describe('create (context)', () => {
    it('builds an image from a context', () => {
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
    it('returns a context', () => {
      const img = ImageFile.create('https://example.com/test.png');
      const ctx = img.toContext();
      expect(ctx.identifier).toBe('https://example.com/test.png');
      expect(ctx.name).toBe('https://example.com/test.png');
      expect(ctx.url).toBe('https://example.com/test.png');
    });
  });

  describe('state', () => {
    it('holds nothing with neither bytes nor a url', () => {
      const img = ImageFile.createEmpty('empty');
      expect(img.state).toBe(ImageState.NULL);
    });

    it('carries a url on its own', () => {
      const img = ImageFile.create('https://example.com/img.jpg');
      expect(img.state).toBe(ImageState.URL);
    });
  });

  describe('apply', () => {
    it('applies values onto an empty context', () => {
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
