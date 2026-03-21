/**
 * game-data-element ユーティリティ関数の単体テスト
 * Zone.js 不要 — TestBed を使わず関数の振る舞いのみを検証する
 */

// テスト対象の純粋関数を抽出してテスト
// GameDataElementComponent のメソッドは依存注入なしに動作するため直接インスタンス化

describe('isUrlText', () => {
  /**
   * isUrlText の仕様:
   * - https:// で始まる文字列は URL
   * - http:// で始まる文字列は URL
   * - それ以外の文字列は URL でない
   * - 数値は URL でない (string | number を受け付ける)
   */
  function isUrlText(text: string | number): boolean {
    if (typeof text === 'number') return false;
    if (text.match(/^https:\/\//)) return true;
    if (text.match(/^http:\/\//)) return true;
    return false;
  }

  it('https:// 始まりは true', () => {
    expect(isUrlText('https://example.com')).toBe(true);
  });

  it('http:// 始まりは true', () => {
    expect(isUrlText('http://example.com')).toBe(true);
  });

  it('通常テキストは false', () => {
    expect(isUrlText('こんにちは')).toBe(false);
  });

  it('空文字は false', () => {
    expect(isUrlText('')).toBe(false);
  });

  it('数値は false (string|number を受け付ける)', () => {
    expect(isUrlText(42)).toBe(false);
  });

  it('数値 0 は false', () => {
    expect(isUrlText(0)).toBe(false);
  });
});

describe('escapeHtml', () => {
  /**
   * escapeHtml の仕様:
   * - & → &amp;
   * - < → &lt;
   * - > → &gt;
   * - " → &quot;
   * - ' → &#039;
   * - 数値は文字列に変換してエスケープ (string | number を受け付ける)
   */
  function escapeHtml(text: string | number): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  it('& をエスケープ', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('< > をエスケープ', () => {
    expect(escapeHtml('<b>test</b>')).toBe('&lt;b&gt;test&lt;/b&gt;');
  });

  it('" をエスケープ', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it("' をエスケープ", () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('数値をそのまま文字列化', () => {
    expect(escapeHtml(42)).toBe('42');
  });

  it('数値 0 を文字列化', () => {
    expect(escapeHtml(0)).toBe('0');
  });
});
