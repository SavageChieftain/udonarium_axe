import { test } from '@playwright/test';

import { becomeGm, closePanels, prepare, snap } from './fixtures';

test('the game master and player toolbars look the same', async ({ page }) => {
  await prepare(page);
  await becomeGm(page);
  await closePanels(page);
  await snap(page, 'toolbars');
});
