import {
  BUFF_COLORS,
  isBuffColorToken,
  parseBuffAppearance,
  resolveBuffColor,
} from '@axe/domain/character/buff-appearance';

describe('resolveBuffColor()', () => {
  it('パレットの名前を色に直すこと', () => {
    expect(resolveBuffColor('red')).toBe(BUFF_COLORS[0].hex);
    expect(resolveBuffColor('RED')).toBe(BUFF_COLORS[0].hex);
  });

  it('日本語の色名も受け取ること', () => {
    expect(resolveBuffColor('赤')).toBe(resolveBuffColor('red'));
    expect(resolveBuffColor('青')).toBe(resolveBuffColor('blue'));
    expect(resolveBuffColor('灰')).toBe(resolveBuffColor('grey'));
  });

  it('16 進の指定をそのまま使うこと', () => {
    expect(resolveBuffColor('#A0C')).toBe('#a0c');
    expect(resolveBuffColor('#1B2C3D')).toBe('#1b2c3d');
  });

  it('既定に戻す指定と未知の指定は空にすること', () => {
    expect(resolveBuffColor('既定')).toBe('');
    expect(resolveBuffColor('none')).toBe('');
    expect(resolveBuffColor('こんな色は無い')).toBe('');
    expect(resolveBuffColor('')).toBe('');
  });
});

describe('isBuffColorToken()', () => {
  it('色として解釈できるものだけ真にすること', () => {
    expect(isBuffColorToken('green')).toBe(true);
    expect(isBuffColorToken('#fff')).toBe(true);
    expect(isBuffColorToken('既定')).toBe(true);
    expect(isBuffColorToken('☠️')).toBe(false);
    expect(isBuffColorToken('')).toBe(false);
  });
});

describe('parseBuffAppearance()', () => {
  it('色とアイコンを順不同で振り分けること', () => {
    expect(parseBuffAppearance(['red', '☠️'])).toEqual({ color: resolveBuffColor('red'), icon: '☠️' });
    expect(parseBuffAppearance(['☠️', 'red'])).toEqual({ color: resolveBuffColor('red'), icon: '☠️' });
  });

  it('片方だけの指定では片方だけを返すこと', () => {
    expect(parseBuffAppearance(['blue'])).toEqual({ color: resolveBuffColor('blue') });
    expect(parseBuffAppearance(['🔥'])).toEqual({ icon: '🔥' });
  });

  it('既定に戻す指定は空の色として返すこと', () => {
    expect(parseBuffAppearance(['既定'])).toEqual({ color: '' });
  });

  it('指定が無ければ何も返さないこと', () => {
    expect(parseBuffAppearance([])).toEqual({});
    expect(parseBuffAppearance(['', '  '])).toEqual({});
  });
});
