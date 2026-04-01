import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioStorage } from '@axe/core/storage/audio-storage';

describe('AudioStorage', () => {
  let storage: AudioStorage;

  beforeEach(() => {
    storage = AudioStorage.instance;
  });

  afterEach(() => {
    for (const audio of storage.audios) {
      storage.delete(audio.identifier);
    }
    vi.restoreAllMocks();
  });

  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      expect(AudioStorage.instance).toBe(AudioStorage.instance);
    });
  });

  describe('add / get / delete', () => {
    it('URLでオーディオを追加・取得できる', () => {
      const audio = storage.add('https://example.com/test.mp3');
      expect(audio).toBeTruthy();
      expect(audio.identifier).toBe('https://example.com/test.mp3');
      const retrieved = storage.get('https://example.com/test.mp3');
      expect(retrieved).toBe(audio);
    });

    it('AudioFileで追加できる', () => {
      const file = AudioFile.create('https://example.com/music.ogg');
      const added = storage.add(file);
      expect(added).toBe(file);
    });

    it('存在しないIDはnullishを返す', () => {
      expect(storage.get('nonexistent')).toBeFalsy();
    });

    it('オーディオを削除できる', () => {
      storage.add('https://example.com/del.mp3');
      expect(storage.delete('https://example.com/del.mp3')).toBe(true);
      expect(storage.get('https://example.com/del.mp3')).toBeFalsy();
    });

    it('存在しないオーディオの削除はfalse', () => {
      expect(storage.delete('nonexistent')).toBe(false);
    });
  });

  describe('audios', () => {
    it('追加したオーディオのリストを返す', () => {
      storage.add('https://example.com/a.mp3');
      storage.add('https://example.com/b.mp3');
      expect(storage.audios.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getCatalog', () => {
    it('カタログを返す', () => {
      storage.add('https://example.com/catalog.mp3');
      const catalog = storage.getCatalog();
      expect(Array.isArray(catalog)).toBe(true);
    });
  });
});
