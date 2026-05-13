import { expect, test } from '@playwright/test';

import { chatTabPill, openChatSettingsMenuItem, waitAppReady } from './helpers';

test.describe('チャットウィンドウ', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test('チャットタブピル (メインタブ・サブタブ) が表示されること', async ({ page }) => {
    await expect(chatTabPill(page, 'メインタブ')).toBeVisible();
    await expect(chatTabPill(page, 'サブタブ')).toBeVisible();
  });

  test('チャットタブを切り替えられること', async ({ page }) => {
    // ラジオ自体は class="peer hidden" で display:none、ラベル内のピル div を
    // クリックすると関連するラジオが checked になる。
    await chatTabPill(page, 'サブタブ').click();
    const subTabRadio = page.locator('chat-window input[name="chat-tab"]').nth(1);
    await expect(subTabRadio).toBeChecked();
  });

  test('送信ボタンが表示されること', async ({ page }) => {
    await expect(page.locator('chat-input').getByRole('button', { name: '送信' })).toBeVisible();
  });

  test('チャットメッセージを入力できること', async ({ page }) => {
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('テストメッセージ');
    await expect(textarea).toHaveValue('テストメッセージ');
  });

  test('チャットメッセージを送信するとログに表示されること', async ({ page }) => {
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('E2Eテスト送信');
    await page.locator('chat-input').getByRole('button', { name: '送信' }).click();
    await expect(textarea).toHaveValue('');
    await expect(page.locator('chat-tab').getByText('E2Eテスト送信')).toBeVisible({ timeout: 10000 });
  });

  test('送信先が「全員」であること (デフォルト)', async ({ page }) => {
    await expect(page.locator('chat-input').getByText('全員')).toBeVisible();
  });

  test('点呼・投票ボタンが存在すること', async ({ page }) => {
    await expect(page.locator('chat-window button[title="点呼・投票"]')).toBeVisible();
  });

  test('アラームボタンが存在すること', async ({ page }) => {
    await expect(page.locator('chat-window button[title="アラーム"]')).toBeVisible();
  });

  test('チャット設定ドロップダウンが開けること', async ({ page }) => {
    const summary = page.locator('chat-window summary[title="チャット設定"]');
    await summary.click();
    const dropdown = page.locator('chat-window details[open]');
    await expect(dropdown.getByRole('button', { name: /タブ設定/ })).toBeVisible();
    await expect(dropdown.getByRole('button', { name: /ダイス表設定/ })).toBeVisible();
    await expect(dropdown.getByRole('button', { name: /チャット設定/ })).toBeVisible();
  });

  test('ダイスボットヘルプボタン (?) が存在すること', async ({ page }) => {
    await expect(page.locator('chat-input').getByRole('button', { name: '?' })).toBeVisible();
  });

  test('色設定ボタンが存在すること', async ({ page }) => {
    await expect(page.locator('chat-input').getByRole('button', { name: /色設定/ })).toBeVisible();
  });
});

test.describe('チャットでダイスロール', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test('ダイスコマンド (2d6) を送信するとダイス結果がログに表示されること', async ({ page }) => {
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('2d6');
    await page.locator('chat-input').getByRole('button', { name: '送信' }).click();
    await expect(textarea).toHaveValue('');
    // 送信ログには「2d6」エコーも残るため、DiceBot の結果メッセージで一意化する
    await expect(page.locator('chat-tab').getByText(/DiceBot.*\(2D6\)/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('チャットタブ設定パネル', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test('歯車メニューからタブ設定パネルが開けること', async ({ page }) => {
    await openChatSettingsMenuItem(page, 'タブ設定');
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
  });

  test('タブ設定パネルにタブ名入力欄があること', async ({ page }) => {
    await openChatSettingsMenuItem(page, 'タブ設定');
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('app-chat-tab-setting input[name="tab-name"]')).toBeVisible();
  });

  test('タブ名を変更できること', async ({ page }) => {
    await openChatSettingsMenuItem(page, 'タブ設定');
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
    const tabNameInput = page.locator('app-chat-tab-setting input[name="tab-name"]');
    await tabNameInput.fill('カスタムタブ名');
    await expect(tabNameInput).toHaveValue('カスタムタブ名');
    // チャットウィンドウのタブピルが新しい名前に切り替わる
    await expect(chatTabPill(page, 'カスタムタブ名')).toBeVisible({ timeout: 5000 });
  });

  test('新しいタブを追加できること', async ({ page }) => {
    await openChatSettingsMenuItem(page, 'タブ設定');
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
    const initialTabCount = await page.locator('chat-window input[name="chat-tab"]').count();
    await page.locator('app-chat-tab-setting button[title="タブを追加"]').click();
    await expect(page.locator('chat-window input[name="chat-tab"]')).toHaveCount(initialTabCount + 1, {
      timeout: 5000,
    });
  });
});

test.describe('点呼・投票ウィンドウ', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test('点呼・投票ボタンをクリックするとウィンドウが開くこと', async ({ page }) => {
    await page.locator('chat-window button[title="点呼・投票"]').click();
    await expect(page.locator('app-vote-menu')).toBeVisible({ timeout: 5000 });
  });

  test('「自分を含める」チェックボックスがあること', async ({ page }) => {
    await page.locator('chat-window button[title="点呼・投票"]').click();
    await expect(page.locator('app-vote-menu')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('app-vote-menu input[name="includSelf"]')).toBeVisible();
    await expect(page.locator('app-vote-menu').getByText('自分を含める')).toBeVisible();
  });

  test('自分しか部屋にいない場合のメッセージが表示されること', async ({ page }) => {
    await page.locator('chat-window button[title="点呼・投票"]').click();
    await expect(page.locator('app-vote-menu')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('app-vote-menu').getByText('自分しか部屋にいません')).toBeVisible();
  });
});

test.describe('チャットのキャラクター送信元', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test('送信元/宛先/ダイスボットの 3 つの ng-select が存在すること', async ({ page }) => {
    await expect(page.locator('chat-input ng-select')).toHaveCount(3);
  });
});

test.describe('ダイス表設定パネル', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test('歯車メニューからダイス表設定パネルが開けること', async ({ page }) => {
    await openChatSettingsMenuItem(page, 'ダイス表設定');
    await expect(page.locator('dice-table-setting')).toBeVisible({ timeout: 5000 });
  });

  test('「新しい表を作る」ボタンがあること', async ({ page }) => {
    await openChatSettingsMenuItem(page, 'ダイス表設定');
    await expect(page.locator('dice-table-setting')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('dice-table-setting button[title="新しい表を作る"]')).toBeVisible();
  });

  test('ダイス表を新規作成できること', async ({ page }) => {
    await openChatSettingsMenuItem(page, 'ダイス表設定');
    await expect(page.locator('dice-table-setting')).toBeVisible({ timeout: 5000 });
    const items = page.locator('dice-table-setting li[role="option"]');
    const initialCount = await items.count();
    await page.locator('dice-table-setting button[title="新しい表を作る"]').click();
    await expect(items).toHaveCount(initialCount + 1, { timeout: 5000 });
  });
});
