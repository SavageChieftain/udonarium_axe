import { expect, test } from '@playwright/test';

test.describe('アプリケーション起動', () => {
  test('アプリが起動すること', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Udonarium/i);
  });

  test('ローディング後にメインUIが表示されること', async ({ page }) => {
    await page.goto('/');
    // ローディングスピナーが消えてapp-rootの中身が描画される
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
  });

  test('左サイドメニューが表示されること', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
    // メニュー項目の存在確認
    await expect(page.getByText('接続')).toBeVisible();
    await expect(page.getByText('チャット画面')).toBeVisible();
    await expect(page.getByText('テーブル設定')).toBeVisible();
    await expect(page.getByText('画像')).toBeVisible();
    await expect(page.getByText('インベントリ')).toBeVisible();
    await expect(page.getByText('ZIP読込')).toBeVisible();
    await expect(page.getByText('保存')).toBeVisible();
  });
});

test.describe('初期パネル表示', () => {
  test('起動時に接続パネルとチャットパネルが自動で開くこと', async ({ page }) => {
    await page.goto('/');
    // PeerMenuComponentが開く（ニックネーム入力欄で確認）
    await expect(page.locator('input[placeholder="ニックネーム"]')).toBeVisible({ timeout: 15000 });
    // ChatWindowComponentが開く（チャット入力欄で確認）
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('接続パネル（PeerMenu）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[placeholder="ニックネーム"]')).toBeVisible({ timeout: 15000 });
  });

  test('ニックネームを変更できること', async ({ page }) => {
    const input = page.locator('input[placeholder="ニックネーム"]');
    await input.fill('テストプレイヤー');
    await expect(input).toHaveValue('テストプレイヤー');
  });

  test('ユーザーIDが表示されること', async ({ page }) => {
    // ネットワーク接続前はID:???が表示される
    await expect(page.getByText('ID：')).toBeVisible();
  });

  test('ブラウザ時刻が表示されること', async ({ page }) => {
    await expect(page.getByText('ブラウザ時刻：')).toBeVisible();
  });

  test('アイコン変更ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'アイコンを変更する' })).toBeVisible();
  });

  test('通信タイムアウト設定を変更できること', async ({ page }) => {
    const timeoutInput = page.locator('input[type="number"][min="1"][max="600"]');
    await expect(timeoutInput).toBeVisible();
    await timeoutInput.fill('30');
    await expect(timeoutInput).toHaveValue('30');
  });

  test('詳細表示チェックボックスが存在すること', async ({ page }) => {
    await expect(page.getByText('詳細を表示')).toBeVisible();
    const checkbox = page.locator('input[type="checkbox"][value="dispDetailFlag"]');
    await expect(checkbox).toBeVisible();
  });

  test('ロビー表示ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /ロビー（ルーム一覧）を表示/ })).toBeVisible();
  });
});

test.describe('ネットワークインジケーター', () => {
  test('ネットワークインジケーターが表示されること', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('network-indicator')).toBeVisible({ timeout: 15000 });
  });
});
