import {
  isPrecompressed,
  ZIP_DEFLATE_LEVEL,
  ZIP_STORE_LEVEL,
  zipCompressionLevel,
} from '@axe/core/storage/zip-compression';

describe('isPrecompressed()', () => {
  it('judges images, sound and video as already compressed', () => {
    expect(isPrecompressed('abc.png', 'image/png')).toBe(true);
    expect(isPrecompressed('abc.mp3', 'audio/mpeg')).toBe(true);
    expect(isPrecompressed('abc.webm', 'video/webm')).toBe(true);
  });

  it('judges by the extension when the type is missing', () => {
    expect(isPrecompressed('abc.jpeg', '')).toBe(true);
    expect(isPrecompressed('ABC.WEBP', '')).toBe(true);
  });

  it('judges text as worth compressing', () => {
    expect(isPrecompressed('data.xml', 'text/plain')).toBe(false);
    expect(isPrecompressed('config.json', 'application/json')).toBe(false);
  });
});

describe('zipCompressionLevel()', () => {
  it('stores already-compressed data without compressing it again', () => {
    expect(zipCompressionLevel('portrait.png', 'image/png')).toBe(ZIP_STORE_LEVEL);
  });

  it('compresses text', () => {
    expect(zipCompressionLevel('data.xml', 'text/plain')).toBe(ZIP_DEFLATE_LEVEL);
  });
});
