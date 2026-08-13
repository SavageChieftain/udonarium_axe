import { readFileSync } from 'node:fs';

/**
 * 卓の中の重ね順を外へ漏らさないこと。
 *
 * 卓レイヤーが重ね合わせの文脈を作らないと、盤の上の演出に付けた z がパネルと同じ土俵で
 * 競り、後ろに置いてあるはずのものが前に出る。
 */
describe('卓レイヤー', () => {
  it('重ね合わせの文脈を自前で作ること', () => {
    const html = readFileSync('src/app/app.component.html', 'utf8');
    const layer = html.slice(html.indexOf('id="app-table-layer"'));
    const classes = layer.slice(layer.indexOf('class="') + 7, layer.indexOf('"', layer.indexOf('class="') + 7));

    expect(classes.split(/\s+/)).toContain('isolate');
  });
});
