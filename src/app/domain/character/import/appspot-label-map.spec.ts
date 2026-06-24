import { buildAppspotLabelMap } from '@axe/domain/character/import/appspot-label-map';

describe('buildAppspotLabelMap', () => {
  // 倉庫フォームに即した構造: 値要素の id に JSON パス、見出しは th。
  // 能力名は class="title"、列指向のみのフォームは素の th を見出しにする。
  const html = `
    <table id="ability">
      <tr>
        <th class="item title" rowspan="2">武勇</th>
        <th class="item">評価</th>
        <td class="input"><span id="ability.brave.dice"></span></td>
        <th class="item title" rowspan="2">技術</th>
        <th class="item">評価</th>
        <td class="input"><span id="ability.technic.dice"></span></td>
      </tr>
    </table>
    <table id="base">
      <tr><th class="item">名前</th><td><input id="base.name"></td></tr>
      <tr><th class="item">職業</th><td><input id="base.job"></td></tr>
    </table>`;

  it('class="title" の見出しを能力名のラベルにする（多列でも取り違えない）', () => {
    const map = buildAppspotLabelMap(html);
    expect(map['ability.brave']).toBe('武勇');
    expect(map['ability.technic']).toBe('技術');
  });

  it('title が無いフォームは最寄りの th を行ラベルにする', () => {
    const map = buildAppspotLabelMap(html);
    expect(map['base.name']).toBe('名前');
    expect(map['base.job']).toBe('職業');
  });
});
