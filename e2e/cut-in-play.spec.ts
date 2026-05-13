import { expect, Page, test } from '@playwright/test';

import { openPanel, waitAppReady } from './helpers';

async function openFirstCutIn(page: Page) {
  await waitAppReady(page);
  await openPanel(page, 'カットイン');
  await expect(page.locator('app-cut-in-list')).toBeVisible({ timeout: 10000 });
  await page.locator('app-cut-in-list button[title="新しいカットインを作る"]').click();
  await expect(page.locator('app-cut-in-list cut-in-editor')).toBeVisible({ timeout: 5000 });
}

test.describe('カットイン再生', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstCutIn(page);
  });

  test('「自分だけ」プレビューボタンを押すと cut-in-window が現れること', async ({ page }) => {
    await page.locator('cut-in-editor button[title="自分だけ再生"]').click();
    await expect(page.locator('app-cut-in-window')).toBeVisible({ timeout: 5000 });
  });

  test('「全員再生」を押すと cut-in-window が現れること', async ({ page }) => {
    await page.locator('cut-in-editor button[title="全員に再生"]').click();
    await expect(page.locator('app-cut-in-window')).toBeVisible({ timeout: 5000 });
  });

  test('再生後の cut-in-window 内に img 要素が含まれていること', async ({ page }) => {
    await page.locator('cut-in-editor button[title="自分だけ再生"]').click();
    const window = page.locator('app-cut-in-window').first();
    await expect(window).toBeVisible({ timeout: 5000 });
    // カットイン画像/動画/プレースホルダのいずれかが描画される。
    await expect(window.locator('img, video').first()).toBeAttached({ timeout: 5000 });
  });
});
