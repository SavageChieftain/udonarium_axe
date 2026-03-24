import { ImageSharingSystem } from './image-sharing-system';

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
});
