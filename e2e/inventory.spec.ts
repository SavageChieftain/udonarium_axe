import { expect, Page, test } from '@playwright/test';

async function openInventory(page: Page) {
  await page.goto('/');
  await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  await page.getByText('インベントリ').click();
  await expect(page.locator('input[name="tab"]')).toHaveCount(3, { timeout: 5000 });
}

test.describe('インベントリパネル', () => {
  test.beforeEach(async ({ page }) => {
    await openInventory(page);
  });

  test('テーブル/コモン/墓場の3タブが表示されること', async ({ page }) => {
    const tabs = page.locator('input[name="tab"]');
    await expect(tabs).toHaveCount(3);
  });

  test('タブを切り替えられること', async ({ page }) => {
    const tabs = page.locator('input[name="tab"]');
    // 2番目のタブ（コモン）に切り替え
    await tabs.nth(1).check({ force: true });
    await expect(tabs.nth(1)).toBeChecked();
    // 3番目のタブ（墓場）に切り替え
    await tabs.nth(2).check({ force: true });
    await expect(tabs.nth(2)).toBeChecked();
  });

  test('墓場タブで「墓場を空にする」ボタンが表示されること', async ({ page }) => {
    const graveyardTab = page.locator('input[name="tab"]').nth(2);
    await graveyardTab.check({ force: true });
    await expect(page.getByRole('button', { name: /墓場を空にする/ })).toBeVisible();
  });

  test('設定ボタンが存在すること', async ({ page }) => {
    await expect(page.locator('game-object-inventory').getByRole('button', { name: /設定/ })).toBeVisible();
  });

  test('一括移動ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /一括移動/ })).toBeVisible();
  });

  test('設定画面を開いて並び順やタグ設定ができること', async ({ page }) => {
    await page.locator('game-object-inventory').getByRole('button', { name: /設定/ }).click();
    await expect(page.locator('input[placeholder="タグ名"]').first()).toBeVisible({ timeout: 3000 });
    // 並び順のセレクト（昇順/降順）が存在する
    await expect(page.locator('game-object-inventory select').first()).toBeVisible();
    // 表示項目の入力欄が存在する
    await expect(
      page.locator('input[placeholder="スペース区切りでタグ名 スラッシュで改行 ex.「HP MP / メモ」"]')
    ).toBeVisible();
    // 完了ボタンで閉じる
    await page.getByRole('button', { name: /完了/ }).click();
  });
});

test.describe('インベントリのコンテキストメニュー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
    // キャラクターを作成
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('キャラクターを作成').click();
    await expect(page.locator('game-character').first()).toBeVisible({ timeout: 5000 });
    // インベントリを開く
    await page.getByText('インベントリ').click();
    await expect(page.locator('input[name="tab"]')).toHaveCount(3, { timeout: 5000 });
  });

  test('インベントリのオブジェクトを右クリックするとコンテキストメニューが表示されること', async ({ page }) => {
    const objects = page.locator('game-object-inventory .box');
    await expect(objects.first()).toBeVisible({ timeout: 5000 });
    await objects.first().click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
  });

  test('インベントリのコンテキストメニューに「詳細を表示」があること', async ({ page }) => {
    const objects = page.locator('game-object-inventory .box');
    await expect(objects.first()).toBeVisible({ timeout: 5000 });
    await objects.first().click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await expect(menu.getByText('詳細を表示')).toBeVisible();
  });

  test('インベントリの「詳細を表示」でシートが開くこと', async ({ page }) => {
    const objects = page.locator('game-object-inventory .box');
    await expect(objects.first()).toBeVisible({ timeout: 5000 });
    await objects.first().click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('詳細を表示').click();
    await expect(page.locator('game-character-sheet')).toBeVisible({ timeout: 5000 });
  });

  test('インベントリのコンテキストメニューに移動項目があること', async ({ page }) => {
    const objects = page.locator('game-object-inventory .box');
    await expect(objects.first()).toBeVisible({ timeout: 5000 });
    await objects.first().click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await expect(menu.getByText('テーブルに移動')).toBeVisible();
    await expect(menu.getByText('墓場に移動')).toBeVisible();
  });
});
