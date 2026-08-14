import { escapeHtml, isUrlText } from '@axe/features/data-element/game-data-element/game-data-element-utils';

describe('isUrlText', () => {
  it('is true for a secure address', () => {
    expect(isUrlText('https://example.com')).toBe(true);
  });

  it('is true for a plain one', () => {
    expect(isUrlText('http://example.com')).toBe(true);
  });

  it('is false for ordinary text', () => {
    expect(isUrlText('こんにちは')).toBe(false);
  });

  it('is false for an empty string', () => {
    expect(isUrlText('')).toBe(false);
  });

  it('is false for a number', () => {
    expect(isUrlText(42)).toBe(false);
  });

  it('is false for zero', () => {
    expect(isUrlText(0)).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes an ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes the angle brackets', () => {
    expect(escapeHtml('<b>test</b>')).toBe('&lt;b&gt;test&lt;/b&gt;');
  });

  it('escapes a double quote', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('escapes a single quote', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('renders a number as it is', () => {
    expect(escapeHtml(42)).toBe('42');
  });

  it('renders a zero', () => {
    expect(escapeHtml(0)).toBe('0');
  });
});
