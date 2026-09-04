import { graphemeEnds, toGraphemes } from '@axe/features/visual-novel/visual-novel-text';

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

describe('graphemeEnds', () => {
  it('gives nothing for an empty line', () => {
    expect(graphemeEnds('')).toEqual([]);
  });

  it('counts one unit per letter of the alphabet', () => {
    expect(graphemeEnds('abc')).toEqual([1, 2, 3]);
  });

  it('counts a Japanese character as one letter of one unit', () => {
    expect(graphemeEnds('あいう')).toEqual([1, 2, 3]);
  });

  it('cuts a line at every end and never through a letter', () => {
    for (const line of ['abc', 'あいう', '👨‍👩‍👧‍👦です', 'étude', '𩸽を焼く']) {
      const ends = graphemeEnds(line);
      const cuts = ends.map((end) => line.slice(0, end));
      expect(cuts[cuts.length - 1]).toBe(line);
      expect(cuts.map((cut, index) => cut.length === ends[index]).every(Boolean)).toBe(true);
      expect(cuts).toEqual(toGraphemes(line).map((_, index, all) => all.slice(0, index + 1).join('')));
    }
  });
});
