import { expect, test } from '@playwright/test';

import { openPanel, waitAppReady } from './helpers';

test.describe('カットイン一覧', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    await openPanel(page, 'カットイン');
    await expect(page.locator('app-cut-in-list')).toBeVisible({ timeout: 10000 });
  });

  test('初期状態は見本が並び、どれか選ぶよう促されること', async ({ page }) => {
    // 既定の部屋には見本のカットインが入っているので、空表示ではなく一覧が出る。
    await expect(page.locator('app-cut-in-list li[role="option"]').first()).toBeVisible();
    await expect(page.locator('app-cut-in-list').getByText('左のリストから選択してください')).toBeVisible();
  });

  test('一覧から選ぶとエディタが開けること', async ({ page }) => {
    await page.locator('app-cut-in-list li[role="option"]').first().click();

    await expect(page.locator('app-cut-in-list cut-in-editor')).toBeVisible({ timeout: 5000 });
    // フッターに保存/削除ボタンが現れる。
    await expect(page.locator('app-cut-in-list').getByRole('button', { name: /保存/ })).toBeVisible();
    await expect(page.locator('app-cut-in-list').getByRole('button', { name: /削除/ })).toBeVisible();
  });

  test('追加ボタン (+) でカットインがリストに追加されること', async ({ page }) => {
    const itemsBefore = await page.locator('app-cut-in-list li[role="option"]').count();
    await page.locator('app-cut-in-list button[title="新しいカットインを作る"]').click();
    await expect(page.locator('app-cut-in-list li[role="option"]')).toHaveCount(itemsBefore + 1, {
      timeout: 5000,
    });
  });
});
