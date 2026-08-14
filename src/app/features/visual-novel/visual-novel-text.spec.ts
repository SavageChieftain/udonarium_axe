import { toGraphemes } from '@axe/features/visual-novel/visual-novel-text';

describe('toGraphemes()', () => {
  it('returns nothing for an empty string', () => {
    expect(toGraphemes('')).toEqual([]);
  });

  it('splits ordinary text a character at a time', () => {
    expect(toGraphemes('こんにちは')).toEqual(['こ', 'ん', 'に', 'ち', 'は']);
  });

  it('keeps a surrogate pair together', () => {
    expect(toGraphemes('やった🎉')).toEqual(['や', 'っ', 'た', '🎉']);
  });

  it('keeps a combined emoji together', () => {
    const graphemes = toGraphemes('👨‍👩‍👧');
    expect(graphemes.join('')).toBe('👨‍👩‍👧');
    expect(graphemes.length).toBeLessThanOrEqual(3);
  });

  it('never leaves a broken character partway through', () => {
    const graphemes = toGraphemes('あ🎉い');
    for (let i = 0; i <= graphemes.length; i++) {
      expect(graphemes.slice(0, i).join('')).not.toContain('�');
      expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(graphemes.slice(0, i).join(''))).toBe(false);
    }
  });
});
