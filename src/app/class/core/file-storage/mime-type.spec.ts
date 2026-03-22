import * as MimeType from './mime-type';

describe('MimeType', () => {
  describe('type()', () => {
    it('png拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('image.png')).toBe('image/png');
    });

    it('jpg拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('photo.jpg')).toBe('image/jpeg');
    });

    it('jpeg拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('photo.jpeg')).toBe('image/jpeg');
    });

    it('gif拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('anim.gif')).toBe('image/gif');
    });

    it('webp拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('image.webp')).toBe('image/webp');
    });

    it('svg拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('icon.svg')).toBe('image/svg+xml');
    });

    it('mp3拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('sound.mp3')).toBe('audio/mp3');
    });

    it('wav拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('sound.wav')).toBe('audio/wav');
    });

    it('ogg拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('sound.ogg')).toBe('audio/ogg');
    });

    it('mp4拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('video.mp4')).toBe('video/mp4');
    });

    it('html拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('page.html')).toBe('text/html');
    });

    it('json拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('data.json')).toBe('application/json');
    });

    it('zip拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('archive.zip')).toBe('application/zip');
    });

    it('大文字の拡張子も認識する', () => {
      expect(MimeType.type('IMAGE.PNG')).toBe('image/png');
    });

    it('パスにドットが含まれていても最後の拡張子を使う', () => {
      expect(MimeType.type('some.file.name.jpg')).toBe('image/jpeg');
    });

    it('不明な拡張子は空文字列を返す', () => {
      expect(MimeType.type('file.unknown')).toBe('');
    });

    it('yaml拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('config.yaml')).toBe('text/yaml');
    });

    it('avif拡張子のMIMEタイプを返す', () => {
      expect(MimeType.type('image.avif')).toBe('image/avif');
    });
  });

  describe('extension()', () => {
    it('image/pngからpng拡張子を返す', () => {
      expect(MimeType.extension('image/png')).toBe('png');
    });

    it('image/jpegからjpg拡張子を返す', () => {
      expect(MimeType.extension('image/jpeg')).toBe('jpg');
    });

    it('audio/mp3からmp3拡張子を返す', () => {
      expect(MimeType.extension('audio/mp3')).toBe('mp3');
    });

    it('不明なMIMEタイプはサブタイプ部分を返す', () => {
      expect(MimeType.extension('application/octet-stream')).toBe('octet-stream');
    });

    it('image/gifからgif拡張子を返す', () => {
      expect(MimeType.extension('image/gif')).toBe('gif');
    });
  });
});
