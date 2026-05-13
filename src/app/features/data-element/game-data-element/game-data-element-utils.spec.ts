import { escapeHtml, isUrlText } from '@axe/features/data-element/game-data-element/game-data-element-utils';

describe('isUrlText', () => {
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
