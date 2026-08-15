import { buildCharasheetLabelMap } from '@axe/domain/character/import/charasheet-label-map';

describe('buildCharasheetLabelMap', () => {
  // The shape of the archive page: the abilities in columns under a header row, the resources in rows.
  const html = `
    <table>
      <tr><th>筋力</th><th>器用</th><th>感覚</th></tr>
      <tr>
        <td><input name="S1" value="4"></td>
        <td><input name="S2" value="3"></td>
        <td><input name="S3" value="2"></td>
      </tr>
    </table>
    <table>
      <tr><th>HP</th><td><input name="HP" value="20"></td></tr>
      <tr><th>MP：</th><td><input name="MP" value="8"></td></tr>
    </table>
    <table>
      <tr><th colspan="2">能力値</th><th>判定値</th></tr>
      <tr><th>肉体</th><td><input name="filler"></td><td><input name="NB1" value="7"></td></tr>
    </table>
    <input name="loose" value="x">`;

  it('labels a value in a column with its column heading', () => {
    const map = buildCharasheetLabelMap(html);
    expect(map['S1']).toBe('筋力');
    expect(map['S2']).toBe('器用');
    expect(map['S3']).toBe('感覚');
  });

  it('labels one in a row with its row heading, without the trailing colon', () => {
    const map = buildCharasheetLabelMap(html);
    expect(map['HP']).toBe('HP');
    expect(map['MP']).toBe('MP');
  });

  it('lines the headings up across a spanned column', () => {
    const map = buildCharasheetLabelMap(html);
    expect(map['NB1']).toBe('判定値');
  });

  it('leaves out an input with no label to take, such as one outside a table', () => {
    const map = buildCharasheetLabelMap(html);
    expect(map['loose']).toBeUndefined();
  });
});
