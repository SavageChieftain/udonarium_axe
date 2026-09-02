import { test } from '@playwright/test';

import { openFabMenu } from '../helpers';
import { closePanels, prepare, snap } from './fixtures';

test('the rail and its menu look the same', async ({ page }) => {
  await prepare(page);
  await closePanels(page);
  await openFabMenu(page);
  await snap(page, 'startup-rail');
});
