import { readFileSync } from 'node:fs';

/**
 * The stacking order inside the table must not leak out of it.
 *
 * Without a stacking context on the table layer, a z-index given to something over the board
 * competes with the panels, and what belongs behind comes out in front.
 */
describe('table layer', () => {
  it('establishes a stacking context of its own', () => {
    const html = readFileSync('src/app/app.component.html', 'utf8');
    const layer = html.slice(html.indexOf('id="app-table-layer"'));
    const classes = layer.slice(layer.indexOf('class="') + 7, layer.indexOf('"', layer.indexOf('class="') + 7));

    expect(classes.split(/\s+/)).toContain('isolate');
  });
});
