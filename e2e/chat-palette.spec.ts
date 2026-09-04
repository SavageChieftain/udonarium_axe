import { expect, test } from '@playwright/test';

import { createCharacter, waitAppReady } from './helpers';

async function openChatPalette(page: import('@playwright/test').Page) {
  await waitAppReady(page);
  await createCharacter(page);
  await page.locator('game-character').first().dispatchEvent('contextmenu');
  await expect(page.locator('context-menu').locator('li').first()).toBeVisible({ timeout: 5000 });
  await page.locator('context-menu').getByText('チャットパレットを表示').click();
  await expect(page.locator('chat-palette')).toBeVisible({ timeout: 10000 });
}

test.describe('チャットパレット', () => {
  test.beforeEach(async ({ page }) => {
    await openChatPalette(page);
  });

  test('パレット内に独自の chat-input と「見出し」「キャラ情報」ボタンが存在すること', async ({ page }) => {
    const palette = page.locator('chat-palette');
    await expect(palette.locator('chat-input')).toBeVisible();
    await expect(palette.getByRole('button', { name: /見出し/ })).toBeVisible();
    await expect(palette.getByRole('button', { name: /キャラ情報/ })).toBeVisible();
  });

  test('「キャラ情報」を押すとビューが切替わり、「パレットに戻る」が出ること', async ({ page }) => {
    const palette = page.locator('chat-palette');
    await palette.getByRole('button', { name: /キャラ情報/ }).click();
    await expect(palette.getByRole('button', { name: /パレットに戻る/ })).toBeVisible({ timeout: 3000 });
  });

  test('編集モードに切り替えると「編集中」ラベルが表示されること', async ({ page }) => {
    const palette = page.locator('chat-palette');
    // 編集トグルボタンには text/title が無く ligature "edit" のみ。title なしのため
    // role=button name は "edit" になる。
    await palette.locator('button', { hasText: 'edit' }).first().click();
    await expect(palette.getByText('編集中')).toBeVisible({ timeout: 3000 });
    await expect(palette.locator('textarea[name="edit-palette"]')).toBeVisible();
  });
});

test.describe('チャット色設定モーダル', () => {
  test('色設定ボタンを押すと chat-color-setting が開けること', async ({ page }) => {
    await waitAppReady(page);
    await page
      .locator('chat-input')
      .getByRole('button', { name: /色設定/ })
      .click();
    await expect(page.locator('chat-color-setting')).toBeVisible({ timeout: 5000 });
    // 編集中の色ぶんのカラーピッカーが居る (name="chat-color-<番号>")。
    await expect(page.locator('chat-color-setting input[type="color"]').first()).toBeAttached();
  });
});
