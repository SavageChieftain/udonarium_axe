import { expect, test } from '@playwright/test';

test.describe('チャットウィンドウ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('チャットタブ（メインタブ・サブタブ）が表示されること', async ({ page }) => {
    await expect(page.getByText('メインタブ')).toBeVisible();
    await expect(page.getByText('サブタブ')).toBeVisible();
  });

  test('チャットタブを切り替えられること', async ({ page }) => {
    const subTabRadio = page.locator('input[name="chat-tab"]').nth(1);
    await subTabRadio.check({ force: true });
    await expect(subTabRadio).toBeChecked();
  });

  test('SENDボタンが表示されること', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'SEND' })).toBeVisible();
  });

  test('チャットメッセージを入力できること', async ({ page }) => {
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('テストメッセージ');
    await expect(textarea).toHaveValue('テストメッセージ');
  });

  test('チャットメッセージを送信するとログに表示されること', async ({ page }) => {
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('E2Eテスト送信');
    await page.getByRole('button', { name: 'SEND' }).click();
    // 送信後、テキストエリアがクリアされる
    await expect(textarea).toHaveValue('');
    // ログにメッセージが表示される
    await expect(page.locator('.log').getByText('E2Eテスト送信')).toBeVisible({ timeout: 5000 });
  });

  test('送信先が「全員」であること（デフォルト）', async ({ page }) => {
    await expect(page.locator('chat-input').getByText('全員')).toBeVisible();
  });

  test('タブ設定ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /タブ設定/ })).toBeVisible();
  });

  test('ダイス表設定ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /ダイス表設定/ })).toBeVisible();
  });

  test('点呼ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /点呼/ })).toBeVisible();
  });

  test('ダイスボットヘルプボタンが存在すること', async ({ page }) => {
    await expect(page.locator('chat-input').getByRole('button', { name: '?' })).toBeVisible();
  });

  test('色設定ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /色設定/ })).toBeVisible();
  });
});

test.describe('チャットでダイスロール', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('ダイスコマンド（2d6）を送信するとダイス結果がログに表示されること', async ({ page }) => {
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('2d6');
    await page.getByRole('button', { name: 'SEND' }).click();
    await expect(textarea).toHaveValue('');
    // ダイス結果がログに表示される（DiceBotの結果にはダイス記号や数値が含まれる）
    await expect(page.locator('.log').getByText(/2D6/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('チャットタブ設定パネル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('タブ設定ボタンをクリックするとパネルが開くこと', async ({ page }) => {
    await page.getByRole('button', { name: /タブ設定/ }).click();
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
  });

  test('タブ設定パネルにタブ名入力フィールドがあること', async ({ page }) => {
    await page.getByRole('button', { name: /タブ設定/ }).click();
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="tab-name"]')).toBeVisible();
  });

  test('タブ名を変更できること', async ({ page }) => {
    await page.getByRole('button', { name: /タブ設定/ }).click();
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
    const tabNameInput = page.locator('input[name="tab-name"]');
    await tabNameInput.fill('カスタムタブ名');
    await expect(tabNameInput).toHaveValue('カスタムタブ名');
    // チャットウィンドウのタブラベルが更新されること
    await expect(page.locator('chat-window').getByText('カスタムタブ名')).toBeVisible({ timeout: 3000 });
  });

  test('新しいタブを追加できること', async ({ page }) => {
    await page.getByRole('button', { name: /タブ設定/ }).click();
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
    const initialTabCount = await page.locator('input[name="chat-tab"]').count();
    await page
      .locator('app-chat-tab-setting')
      .getByRole('button', { name: /新しいタブ/ })
      .click();
    await expect(page.locator('input[name="chat-tab"]')).toHaveCount(initialTabCount + 1, { timeout: 3000 });
  });
});

test.describe('点呼ウィンドウ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('点呼ボタンをクリックするとウィンドウが開くこと', async ({ page }) => {
    await page.getByRole('button', { name: /点呼/ }).click();
    await expect(page.locator('app-vote-menu')).toBeVisible({ timeout: 5000 });
  });

  test('点呼ウィンドウに「自分を含める」チェックボックスがあること', async ({ page }) => {
    await page.getByRole('button', { name: /点呼/ }).click();
    await expect(page.locator('app-vote-menu')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="includSelf"]')).toBeVisible();
    await expect(page.locator('app-vote-menu').getByText('自分を含める')).toBeVisible();
  });

  test('自分しか部屋にいない場合はその旨が表示されること', async ({ page }) => {
    await page.getByRole('button', { name: /点呼/ }).click();
    await expect(page.locator('app-vote-menu')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('app-vote-menu').getByText('自分しか部屋にいません')).toBeVisible();
  });
});

test.describe('チャットのキャラクター送信元', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('ダイスボット選択のng-selectが存在すること', async ({ page }) => {
    // gameTypeのng-selectが存在すること（`chat-input`内）
    const chatInput = page.locator('chat-input');
    // ng-selectコンポーネントが複数ある（送信元、送信先、ダイスボット）
    await expect(chatInput.locator('ng-select')).toHaveCount(3);
  });
});

test.describe('ダイス表設定パネル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('ダイス表設定ボタンをクリックするとパネルが開くこと', async ({ page }) => {
    await page.getByRole('button', { name: /ダイス表設定/ }).click();
    await expect(page.locator('dice-table-setting')).toBeVisible({ timeout: 5000 });
  });

  test('ダイス表設定パネルに「新しい表を作る」ボタンがあること', async ({ page }) => {
    await page.getByRole('button', { name: /ダイス表設定/ }).click();
    await expect(page.locator('dice-table-setting')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('dice-table-setting').getByRole('button', { name: '新しい表を作る' })).toBeVisible();
  });

  test('ダイス表を新規作成できること', async ({ page }) => {
    await page.getByRole('button', { name: /ダイス表設定/ }).click();
    await expect(page.locator('dice-table-setting')).toBeVisible({ timeout: 5000 });
    const tableSelect = page.locator('dice-table-setting select');
    const initialCount = await tableSelect.locator('option').count();
    await page.locator('dice-table-setting').getByRole('button', { name: '新しい表を作る' }).click();
    await expect(tableSelect.locator('option')).toHaveCount(initialCount + 1, { timeout: 5000 });
  });
});
