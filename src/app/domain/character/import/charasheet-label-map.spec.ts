import { buildCharasheetLabelMap } from '@axe/domain/character/import/charasheet-label-map';

describe('buildCharasheetLabelMap', () => {
  // 保管所ページに即した構造: 能力値は列指向（ヘッダ行 + 値行）、HP/MP は行指向。
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

  it('列指向テーブルの値入力に列ヘッダのラベルを与える', () => {
    const map = buildCharasheetLabelMap(html);
    expect(map['S1']).toBe('筋力');
    expect(map['S2']).toBe('器用');
    expect(map['S3']).toBe('感覚');
  });

  it('行指向テーブルの値入力に行ヘッダのラベルを与え、末尾の：を除く', () => {
    const map = buildCharasheetLabelMap(html);
    expect(map['HP']).toBe('HP');
    expect(map['MP']).toBe('MP');
  });

  it('colspan を考慮して列見出しを対応づける', () => {
    const map = buildCharasheetLabelMap(html);
    expect(map['NB1']).toBe('判定値');
  });

  it('表の外などラベルの取れない入力は対象外', () => {
    const map = buildCharasheetLabelMap(html);
    expect(map['loose']).toBeUndefined();
  });
});
