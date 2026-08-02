import { toGraphemes } from '@axe/features/visual-novel/visual-novel-text';

describe('toGraphemes()', () => {
  it('空文字は空配列になること', () => {
    expect(toGraphemes('')).toEqual([]);
  });

  it('通常の文字を 1 文字ずつに分けること', () => {
    expect(toGraphemes('こんにちは')).toEqual(['こ', 'ん', 'に', 'ち', 'は']);
  });

  it('サロゲートペアの絵文字を分割しないこと', () => {
    expect(toGraphemes('やった🎉')).toEqual(['や', 'っ', 'た', '🎉']);
  });

  it('結合絵文字をひとまとまりとして扱うこと', () => {
    const graphemes = toGraphemes('👨‍👩‍👧');
    expect(graphemes.join('')).toBe('👨‍👩‍👧');
    expect(graphemes.length).toBeLessThanOrEqual(3);
  });

  it('途中まで連結しても壊れた文字が出ないこと', () => {
    const graphemes = toGraphemes('あ🎉い');
    for (let i = 0; i <= graphemes.length; i++) {
      expect(graphemes.slice(0, i).join('')).not.toContain('�');
      expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(graphemes.slice(0, i).join(''))).toBe(false);
    }
  });
});
