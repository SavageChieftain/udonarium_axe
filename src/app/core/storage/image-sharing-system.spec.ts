import { ImageContext, ImageState } from './image-file';
import { ImageSharingSystem } from './image-sharing-system';
import { CatalogItem, ImageStorage } from './image-storage';

type ImageSharingSystemPrivate = {
  makeSendUpdateImages: (catalog: CatalogItem[], maxSize?: number) => ImageContext[];
};

describe('ImageSharingSystem', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      expect(ImageSharingSystem.instance).toBe(ImageSharingSystem.instance);
    });
  });

  describe('initialize', () => {
    it('initializeを呼んでもエラーにならない', () => {
      ImageSharingSystem.instance.initialize();
      expect(true).toBe(true);
    });
  });

  describe('makeSendUpdateImages', () => {
    it('blob が欠損した image でも例外を投げずに処理できる', () => {
      const imageLike = {
        identifier: 'broken-image',
        name: 'broken-image',
        state: ImageState.COMPLETE,
        url: '',
        blob: null,
        thumbnail: { type: '', blob: null, url: '' },
      };

      vi.spyOn(ImageStorage.instance, 'get').mockReturnValue(imageLike as never);

      const catalog: CatalogItem[] = [{ identifier: 'broken-image', state: ImageState.COMPLETE }];

      expect(() =>
        (ImageSharingSystem.instance as unknown as ImageSharingSystemPrivate).makeSendUpdateImages(catalog, 1024)
      ).not.toThrow();
    });
  });
});
