import { LinkifyPipe } from '@axe/shared/pipes/linkify.pipe';

describe('LinkifyPipe', () => {
  let pipe: LinkifyPipe;

  beforeEach(() => {
    pipe = new LinkifyPipe();
  });

  it('インスタンスを作成できる', () => {
    expect(pipe).toBeTruthy();
  });

  it('通常テキストはそのまま返す', () => {
    expect(pipe.transform('ただのテキスト')).toBe('ただのテキスト');
  });

  it('URLをリンクタグに変換する', () => {
    const result = pipe.transform('https://example.com にアクセス');
    expect(result).toContain('<a');
    expect(result).toContain('https://example.com');
    expect(result).toContain('</a>');
  });

  it('リンクが別タブで開くようtarget="_blank"が付与される', () => {
    const result = pipe.transform('https://example.com');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('複数URLを変換する', () => {
    const result = pipe.transform('https://a.com と https://b.com');
    expect(result).toContain('https://a.com');
    expect(result).toContain('https://b.com');
    const linkCount = (result.match(/<a /g) ?? []).length;
    expect(linkCount).toBe(2);
  });

  it('nullを空文字に変換する', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('undefinedを空文字に変換する', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('数値を文字列に変換して処理する', () => {
    const result = pipe.transform(12345);
    expect(result).toBe('12345');
  });

  it('メールアドレスをリンクに変換する', () => {
    const result = pipe.transform('test@example.com');
    expect(result).toContain('<a');
    expect(result).toContain('test@example.com');
  });
});
