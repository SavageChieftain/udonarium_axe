import { expect, test } from '@playwright/test';

import { chooseMenu, closePanels, freeze, hoverMenu, prepare, rightClickTable, settle, snap } from './fixtures';

for (const [kind, name] of [
  ['毒沼', 'ambience-swamp'],
  ['溶岩', 'ambience-lava'],
] as const) {
  test(`the ${name} ground looks the same one second in`, async ({ page }) => {
    await prepare(page);
    await closePanels(page);
    await freeze(page);
    const menu = await rightClickTable(page, { x: 800, y: 380 });
    await hoverMenu(page, menu, '環境エフェクトを置く');
    await chooseMenu(page, menu, kind);
    await expect(page.locator('table-ambience')).toHaveCount(1);
    await settle(page, 1200);
    await snap(page, name, { maxDiffPixels: 48 });
  });
}
