import { expect, test } from '@playwright/test';

import { chatTabPill, openChatSettingsMenuItem, waitAppReady } from './helpers';

test.describe('チャット システム表示先タブ', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    await openChatSettingsMenuItem(page, 'タブ設定');
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
  });

  test('「現在: 」表示にシステムタブ名が出ていること (デフォルトはメインタブ)', async ({ page }) => {
    await expect(page.locator('app-chat-tab-setting').getByText(/現在: メインタブ/)).toBeVisible();
  });

  test('サブタブを選択 → 「システム表示先を設定」でシステム表示先がサブタブに切替わること', async ({ page }) => {
    // 左カラムのタブリスト (li[role=option]) の 2 番目 (サブタブ) をクリック。
    await page.locator('app-chat-tab-setting li[role="option"]').nth(1).click();
    // タブ名入力欄がサブタブの内容に同期。
    const tabNameInput = page.locator('app-chat-tab-setting input[name="tab-name"]');
    await expect(tabNameInput).toHaveValue('サブタブ');
    // 「システム表示先を設定」を押下。
    await page
      .locator('app-chat-tab-setting')
      .getByRole('button', { name: /システム表示先を設定/ })
      .click();
    // 表示が「現在: サブタブ」に更新。
    await expect(page.locator('app-chat-tab-setting').getByText(/現在: サブタブ/)).toBeVisible({
      timeout: 5000,
    });
  });

  test('タブピル経由でチャットウィンドウ側のメインタブが選択状態であること (sanity)', async ({ page }) => {
    // 上記テストの前提として、チャットウィンドウの ChatTabList が起動している。
    await expect(chatTabPill(page, 'メインタブ')).toBeVisible();
  });
});
