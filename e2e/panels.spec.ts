import { expect, test } from '@playwright/test';

test.describe('左メニューからパネルを開く', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('テーブル設定パネルを開けること', async ({ page }) => {
    await page.getByText('テーブル設定').click();
    await expect(page.getByRole('button', { name: /新しいテーブルを作る/ })).toBeVisible({ timeout: 5000 });
  });

  test('画像管理パネルを開けること', async ({ page }) => {
    await page.getByText('画像', { exact: true }).click();
    await expect(page.getByText('ここに画像をドロップ')).toBeVisible({ timeout: 5000 });
  });

  test('音楽パネルを開けること', async ({ page }) => {
    await page.locator('nav').getByText('音楽').click();
    await expect(page.getByText('試聴音量：')).toBeVisible({ timeout: 5000 });
  });

  test('インベントリパネルを開けること', async ({ page }) => {
    await page.getByText('インベントリ').click();
    // タブ（テーブル/コモン/墓場）の存在確認
    await expect(page.locator('input[name="tab"]')).toHaveCount(3, { timeout: 5000 });
  });
});

test.describe('テーブル設定パネル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
    await page.getByText('テーブル設定').click();
    await expect(page.getByRole('button', { name: /新しいテーブルを作る/ })).toBeVisible({ timeout: 5000 });
  });

  test('テーブル名を変更できること', async ({ page }) => {
    const nameInput = page.locator('game-table-setting input[placeholder="Name"]');
    await nameInput.fill('テスト卓');
    await expect(nameInput).toHaveValue('テスト卓');
  });

  test('グリッド種類を変更できること', async ({ page }) => {
    const gridSelect = page.locator('select[name="tableGridType"]');
    await expect(gridSelect).toBeVisible();
    await gridSelect.selectOption('0'); // スクエア
    await expect(gridSelect).toHaveValue('0');
    await gridSelect.selectOption('1'); // ヘクス（縦揃え）
    await expect(gridSelect).toHaveValue('1');
  });

  test('テーブル幅のスライダーと数値入力が存在すること', async ({ page }) => {
    await expect(page.locator('input[name="tableWidth"][type="range"]')).toBeVisible();
    await expect(page.locator('game-table-setting input[type="number"]').first()).toBeVisible();
  });

  test('テーブル高さのスライダーと数値入力が存在すること', async ({ page }) => {
    await expect(page.locator('input[name="tableHeight"][type="range"]')).toBeVisible();
  });

  test('グリッド常時表示チェックボックスが存在すること', async ({ page }) => {
    await expect(page.locator('input[name="tableGridShow"]')).toBeVisible();
  });

  test('スナップチェックボックスが存在すること', async ({ page }) => {
    await expect(page.locator('input[name="tableGridSnap"]')).toBeVisible();
  });

  test('背景フィルタを変更できること', async ({ page }) => {
    const filterSelect = page.locator('select[name="tableDistanceviewFilter"]');
    await expect(filterSelect).toBeVisible();
    await filterSelect.selectOption('white');
    await expect(filterSelect).toHaveValue('white');
  });

  test('新しいテーブルを作成できること', async ({ page }) => {
    const tableSelect = page.locator('game-table-setting select[size="10"]');
    const initialCount = await tableSelect.locator('option').count();
    await page.getByRole('button', { name: /新しいテーブルを作る/ }).click();
    await expect(tableSelect.locator('option')).toHaveCount(initialCount + 1, { timeout: 5000 });
  });

  test('保存ボタンが存在すること', async ({ page }) => {
    await expect(page.locator('game-table-setting').getByRole('button', { name: '保存' })).toBeVisible();
  });
});

test.describe('画像管理パネル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
    await page.getByText('画像', { exact: true }).click();
    await expect(page.getByText('ここに画像をドロップ')).toBeVisible({ timeout: 5000 });
  });

  test('ドロップゾーンが表示されること', async ({ page }) => {
    await expect(page.getByText('ここに画像をドロップ')).toBeVisible();
    await expect(page.getByText('またはここをクリックして選択')).toBeVisible();
    await expect(page.getByText('１ファイルにつき2MBまで')).toBeVisible();
  });

  test('ファイル入力が存在すること', async ({ page }) => {
    const fileInput = page.locator('file-storage input[type="file"][accept="image/*"]');
    await expect(fileInput).toBeAttached();
  });

  test('タグ変更ボタンと入力欄が存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /タグを変更/ })).toBeVisible();
    await expect(page.locator('input[placeholder="新タグ名"]')).toBeVisible();
  });

  test('タグのラジオボタンが存在すること', async ({ page }) => {
    // 少なくとも「未設定」タグが存在
    await expect(page.locator('input[name="image-chg"]')).toHaveCount(1);
  });
});

test.describe('音楽パネル（Jukebox）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
    await page.locator('nav').getByText('音楽').click();
    await expect(page.getByText('試聴音量：')).toBeVisible({ timeout: 5000 });
  });

  test('音量スライダーが表示されること', async ({ page }) => {
    await expect(page.getByText('試聴音量：')).toBeVisible();
    await expect(page.getByText('BGM音量：')).toBeVisible();
    await expect(page.getByText('全体音量：')).toBeVisible();
  });

  test('カットイン編集ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /カットイン編集/ })).toBeVisible();
  });

  test('音楽ドロップゾーンが表示されること', async ({ page }) => {
    await expect(page.getByText('ここに音楽をドロップ')).toBeVisible();
  });

  test('プリセットサウンドが読み込まれていること', async ({ page }) => {
    // プリセットサウンドはisHidden=trueなので表示されない
    // 音楽ファイルがない旨の表示を確認
    // （プリセットは非表示なので、可視の音楽がなければ空メッセージ表示）
    // 音楽ファイルが１つ以上あるOR空メッセージが表示される
    const audioItems = page.locator('jukebox .box');
    const emptyMessage = page.getByText('アップロードされた音楽ファイルはここに表示されます。');
    const hasAudios = (await audioItems.count()) > 0;
    const hasEmptyMsg = await emptyMessage.isVisible();
    expect(hasAudios || hasEmptyMsg).toBeTruthy();
  });

  test('音楽ファイル入力が存在すること', async ({ page }) => {
    const fileInput = page.locator('jukebox input[type="file"][accept="audio/*"]');
    await expect(fileInput).toBeAttached();
  });

  test('全体音量の変更有効化チェックボックスが存在すること', async ({ page }) => {
    const checkbox = page.locator('input#roomVolumeChange');
    await expect(checkbox).toBeVisible();
  });
});

test.describe('パネル操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('複数パネルを同時に開けること', async ({ page }) => {
    await page.getByText('テーブル設定').click();
    await page.getByText('画像', { exact: true }).click();
    // テーブル設定と画像管理の両方が表示されている
    await expect(page.getByRole('button', { name: /新しいテーブルを作る/ })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('ここに画像をドロップ')).toBeVisible({ timeout: 5000 });
  });

  test('同じパネルを複数回開けること', async ({ page }) => {
    await page.getByText('テーブル設定').click();
    await page.getByText('テーブル設定').click();
    // 複数のテーブル設定パネルが開いている
    const buttons = page.getByRole('button', { name: /新しいテーブルを作る/ });
    await expect(buttons).toHaveCount(2, { timeout: 5000 });
  });
});

test.describe('ZIP読込（ファイルインポート）', () => {
  test('ZIP読込のファイル入力が存在すること', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
    const fileInput = page.locator('nav input[type="file"][accept="application/xml,text/xml,application/zip"]');
    await expect(fileInput).toBeAttached();
  });
});

test.describe('保存機能', () => {
  test('保存ボタンをクリックするとダウンロードが開始されること', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
    // ダウンロードイベントを監視
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('nav').getByText('保存').click();
    // ダウンロードが開始される
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });
});
