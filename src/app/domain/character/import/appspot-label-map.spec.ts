import { buildAppspotLabelMap } from '@axe/domain/character/import/appspot-label-map';

describe('buildAppspotLabelMap', () => {
  // The shape of the warehouse form: the path in the identifier of each value, the label in a heading.
  // An ability name carries the title class, and a form laid out in columns uses a plain heading.
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

  it('takes a titled heading as the name of an ability, whatever the columns', () => {
    const map = buildAppspotLabelMap(html);
    expect(map['ability.brave']).toBe('武勇');
    expect(map['ability.technic']).toBe('技術');
  });

  it('falls back to the nearest heading as the row label', () => {
    const map = buildAppspotLabelMap(html);
    expect(map['base.name']).toBe('名前');
    expect(map['base.job']).toBe('職業');
  });
});
