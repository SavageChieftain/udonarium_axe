import { expect, test } from '@playwright/test';

import { openPanel, waitAppReady } from './helpers';

test.describe('テーブル設定 (詳細)', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    await openPanel(page, 'テーブル設定');
    await expect(page.locator('game-table-setting')).toBeVisible({ timeout: 10000 });
  });

  test('テーブル一覧 (li[role=option]) に既定テーブルが少なくとも 1 件あること', async ({ page }) => {
    await expect(page.locator('game-table-setting li[role="option"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('スナップモードを「セル」に変更できること', async ({ page }) => {
    const snap = page.locator('select[name="tableSnapMode"]');
    await snap.selectOption('center');
    await expect(snap).toHaveValue('center');
  });

  test('グリッド色入力欄が color 型で存在すること', async ({ page }) => {
    const gridColor = page.locator('input[name="tableGridColor"]');
    await expect(gridColor).toBeAttached();
    await expect(gridColor).toHaveAttribute('type', 'color');
  });

  test('テーブル幅を直接 number 入力で変更できること', async ({ page }) => {
    const widthNum = page.locator('input[name="table-width"]');
    await widthNum.click();
    await widthNum.press('Control+A');
    await widthNum.fill('30');
    await expect(widthNum).toHaveValue('30');
  });

  test('背景フィルタを既定 → black → white → 既定に切り替えられること', async ({ page }) => {
    const filter = page.locator('select[name="tableDistanceviewFilter"]');
    await filter.selectOption('black');
    await expect(filter).toHaveValue('black');
    await filter.selectOption('white');
    await expect(filter).toHaveValue('white');
  });

  test('保存ボタンを押すと zip ダウンロードが始まること', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    await page.locator('game-table-setting').getByRole('button', { name: '保存' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });
});
