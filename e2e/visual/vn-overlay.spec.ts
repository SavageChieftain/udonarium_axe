import { expect, test } from '@playwright/test';

import { openPanel, vnMessageInput } from '../helpers';
import { closePanels, freeze, prepare, settle, snap } from './fixtures';

test('a line typed into the novel overlay looks the same mid-reveal', async ({ page }) => {
  await prepare(page);
  await closePanels(page);
  await openPanel(page, 'ノベルモード');
  await expect(page.locator('visual-novel-overlay')).toBeVisible();
  const input = vnMessageInput(page);
  await input.fill('準備');
  await input.press('Enter');
  await expect(page.locator('visual-novel-overlay')).toContainText('準備', { timeout: 30000 });
  await freeze(page);
  await input.fill('やあ、これはテストです。長めの台詞でタイプライタの途中を撮る。');
  await input.press('Enter');
  await settle(page, 600);
  await snap(page, 'vn-overlay');
});
