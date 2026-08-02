import {
  isPrecompressed,
  ZIP_DEFLATE_LEVEL,
  ZIP_STORE_LEVEL,
  zipCompressionLevel,
} from '@axe/core/storage/zip-compression';

describe('isPrecompressed()', () => {
  it('画像・音声・動画は再圧縮しても縮まないと判定すること', () => {
    expect(isPrecompressed('abc.png', 'image/png')).toBe(true);
    expect(isPrecompressed('abc.mp3', 'audio/mpeg')).toBe(true);
    expect(isPrecompressed('abc.webm', 'video/webm')).toBe(true);
  });

  it('MIME タイプが空でも拡張子で判定すること', () => {
    expect(isPrecompressed('abc.jpeg', '')).toBe(true);
    expect(isPrecompressed('ABC.WEBP', '')).toBe(true);
  });

  it('テキストは圧縮対象と判定すること', () => {
    expect(isPrecompressed('data.xml', 'text/plain')).toBe(false);
    expect(isPrecompressed('config.json', 'application/json')).toBe(false);
  });
});

describe('zipCompressionLevel()', () => {
  it('圧縮済みデータは格納のみにすること', () => {
    expect(zipCompressionLevel('portrait.png', 'image/png')).toBe(ZIP_STORE_LEVEL);
  });

  it('テキストは deflate すること', () => {
    expect(zipCompressionLevel('data.xml', 'text/plain')).toBe(ZIP_DEFLATE_LEVEL);
  });
});
