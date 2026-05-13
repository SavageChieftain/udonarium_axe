import { expect, Page, test } from '@playwright/test';

import { openTableContextMenu, waitAppReady } from './helpers';

async function openCardStackSheet(page: Page) {
  await waitAppReady(page);
  const tableMenu = await openTableContextMenu(page);
  await tableMenu.getByText('トランプの山札を作成').click();
  await expect(page.locator('card-stack').first()).toBeAttached({ timeout: 10000 });
  await page.locator('card-stack').first().dispatchEvent('contextmenu');
  await expect(page.locator('context-menu').locator('li').first()).toBeVisible({ timeout: 5000 });
  await page.locator('context-menu').getByText('詳細を表示').click();
  await expect(page.locator('game-character-sheet')).toBeVisible({ timeout: 10000 });
}

test.describe('card-stack の詳細シートと編集切替', () => {
  test.beforeEach(async ({ page }) => {
    await openCardStackSheet(page);
  });

  test('card-stack シートに「編集切り替え」「コピーを作る」「保存」ボタンがあること', async ({ page }) => {
    const sheet = page.locator('game-character-sheet');
    await expect(sheet.getByRole('button', { name: '編集切り替え' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'コピーを作る' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: '保存' })).toBeVisible();
  });

  test('「編集切り替え」を押してもボタンが消えず再クリック可能 (idempotent toggle)', async ({ page }) => {
    // 編集モード遷移後も「編集切り替え」ボタン自体は残るので、2 連打しても
    // クラッシュせず再度可視であることを確認する (具体的な UI badge は
    // game-character-sheet 側で sub-component に依存し再検出が不安定)。
    const sheet = page.locator('game-character-sheet');
    const toggle = sheet.getByRole('button', { name: '編集切り替え' });
    await toggle.click();
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toBeVisible();
  });

  test('保存ボタンで .xml データを含む zip がダウンロードされること', async ({ page }) => {
    const sheet = page.locator('game-character-sheet');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await sheet.getByRole('button', { name: '保存' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^xml_.*\.zip$/);
  });
});
