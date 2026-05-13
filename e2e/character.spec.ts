import { expect, test } from '@playwright/test';

import { createCharacter, waitAppReady } from './helpers';

test.describe('キャラクターのコンテキストメニュー', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    await createCharacter(page);
    await page.locator('game-character').first().dispatchEvent('contextmenu');
    await expect(page.locator('context-menu').locator('li').first()).toBeVisible({ timeout: 5000 });
  });

  test('主要メニュー項目 (詳細/チャパレ/リモコン/バフ/コピー) が揃っていること', async ({ page }) => {
    const menu = page.locator('context-menu');
    await expect(menu.getByText('詳細を表示')).toBeVisible();
    await expect(menu.getByText('チャットパレットを表示')).toBeVisible();
    await expect(menu.getByText('リモコンを表示')).toBeVisible();
    await expect(menu.getByText('バフ編集')).toBeVisible();
    await expect(menu.getByText('コピーを作る')).toBeVisible();
  });

  test('「バフ編集」でバフ編集パネルが開けること', async ({ page }) => {
    await page.locator('context-menu').getByText('バフ編集').click();
    await expect(page.locator('game-character-buff-view')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('game-character-buff-view').getByRole('button', { name: /バフを追加/ })).toBeVisible();
  });

  test('「バフ編集」でバフを追加できること', async ({ page }) => {
    await page.locator('context-menu').getByText('バフ編集').click();
    await expect(page.locator('game-character-buff-view')).toBeVisible({ timeout: 5000 });
    const before = await page.locator('game-character-buff-view [game-data-element-buff]').count();
    await page
      .locator('game-character-buff-view')
      .getByRole('button', { name: /バフを追加/ })
      .click();
    await expect
      .poll(() => page.locator('game-character-buff-view [game-data-element-buff]').count(), {
        timeout: 5000,
      })
      .toBeGreaterThan(before);
  });

  test('高度設定サブメニューに「高度を0にする」があること', async ({ page }) => {
    await page.locator('context-menu').getByText('高度設定').hover();
    await expect(page.locator('context-menu').getByText('高度を0にする')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('キャラクターシート (詳細パネル)', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    await createCharacter(page);
    await page.locator('game-character').first().dispatchEvent('contextmenu');
    await expect(page.locator('context-menu').locator('li').first()).toBeVisible({ timeout: 5000 });
    await page.locator('context-menu').getByText('詳細を表示').click();
    await expect(page.locator('game-character-sheet')).toBeVisible({ timeout: 10000 });
  });

  test('保存ボタンで XML データを内包した zip がダウンロードされること', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('game-character-sheet').getByRole('button', { name: '保存' }).click();
    const download = await downloadPromise;
    // SaveDataService はキャラ単体でも xml_<name>_<timestamp>.zip 形式で保存する。
    expect(download.suggestedFilename()).toMatch(/^xml_.*\.zip$/);
  });
});
