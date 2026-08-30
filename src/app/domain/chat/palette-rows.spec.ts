import { paletteCommandGroups, paletteRowsOf } from '@axe/domain/chat/palette-rows';

describe('reading a palette line for what it is', () => {
  it('tells a heading from what follows it', () => {
    const rows = paletteRowsOf(['//----戦闘----', '◆移動', '2d6+3 攻撃']);

    expect(rows.map((row) => row.kind)).toEqual(['heading', 'heading', 'command']);
    expect(rows[0].headingName).toBe('戦闘');
    expect(rows[1].headingName).toBe('移動');
  });

  it('tells a variable from a line to say', () => {
    const rows = paletteRowsOf(['//威力=7', '//全角＝も', '2d6+{威力}']);

    expect(rows.map((row) => row.kind)).toEqual(['variable', 'variable', 'command']);
  });

  it('calls a line with nothing on it empty', () => {
    expect(paletteRowsOf(['', '   ']).map((row) => row.kind)).toEqual(['empty', 'empty']);
  });

  it('keeps the place of each line', () => {
    expect(paletteRowsOf(['a', 'b', 'c']).map((row) => row.lineIndex)).toEqual([0, 1, 2]);
  });

  it('gathers only what is worth sending, under the heading it sits below', () => {
    const lines = ['//----戦闘----', '  2d6+3 攻撃  ', '//威力=7', '', '◆回復', ':HP+5'];

    expect(paletteCommandGroups(lines)).toEqual([
      { heading: '戦闘', lines: ['2d6+3 攻撃'] },
      { heading: '回復', lines: [':HP+5'] },
    ]);
  });

  it('keeps the lines written before any heading together', () => {
    expect(paletteCommandGroups(['1d100', '◆戦闘', '2d6'])).toEqual([
      { heading: '', lines: ['1d100'] },
      { heading: '戦闘', lines: ['2d6'] },
    ]);
  });

  it('drops a heading with nothing to send under it', () => {
    expect(paletteCommandGroups(['◆空', '', '//威力=7'])).toEqual([]);
  });
});
