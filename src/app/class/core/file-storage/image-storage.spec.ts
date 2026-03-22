import { ImageStorage } from './image-storage';
import { ImageFile } from './image-file';

describe('ImageStorage', () => {
  let storage: ImageStorage;

  beforeEach(() => {
    storage = ImageStorage.instance;
  });

  afterEach(() => {
    // 追加した画像をクリーンアップ
    for (const img of storage.images) {
      storage.delete(img.identifier);
    }
    vi.restoreAllMocks();
  });

  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      expect(ImageStorage.instance).toBe(ImageStorage.instance);
    });
  });

  describe('add / get / delete', () => {
    it('URLで画像を追加・取得できる', () => {
      const img = storage.add('https://example.com/test.png');
      expect(img).toBeTruthy();
      expect(img.identifier).toBe('https://example.com/test.png');
      const retrieved = storage.get('https://example.com/test.png');
      expect(retrieved).toBe(img);
    });

    it('ImageFileで画像を追加できる', () => {
      const file = ImageFile.createEmpty('img-123');
      const added = storage.add(file);
      expect(added).toBe(file);
      expect(storage.get('img-123')).toBe(file);
    });

    it('存在しないIDでgetするとnullishを返す', () => {
      expect(storage.get('nonexistent')).toBeFalsy();
    });

    it('画像を削除できる', () => {
      storage.add('https://example.com/del.png');
      expect(storage.delete('https://example.com/del.png')).toBe(true);
      expect(storage.get('https://example.com/del.png')).toBeFalsy();
    });

    it('存在しない画像の削除はfalse', () => {
      expect(storage.delete('nonexistent')).toBe(false);
    });
  });

  describe('images', () => {
    it('追加した画像のリストを返す', () => {
      storage.add('https://example.com/a.png');
      storage.add('https://example.com/b.png');
      expect(storage.images.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getCatalog', () => {
    it('COMPLETE以上の画像カタログを返す', () => {
      // URL状態の画像はstate=1000なのでカタログに含まれる
      storage.add('https://example.com/catalog.png');
      const catalog = storage.getCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(1);
      const item = catalog.find((c) => c.identifier === 'https://example.com/catalog.png');
      expect(item).toBeTruthy();
    });
  });
});
