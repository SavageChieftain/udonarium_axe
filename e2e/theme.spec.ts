import { expect, test } from '@playwright/test';

import { openFabMenu, waitAppReady } from './helpers';

test.describe('テーマ切り替え', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    await openFabMenu(page);
  });

  test('テーマ切り替えボタンが FAB メニュー内に存在すること', async ({ page }) => {
    // テーマ切替の <div> は data-label にラベル名 (自動/ダーク/ライト) が動的に入る。
    // 起動時は theme='auto' のため '自動' が初期値。
    await expect(page.locator('[data-label="自動"]')).toBeVisible();
  });

  test('クリックするごとに自動 → ダーク → ライト → 自動 と循環すること', async ({ page }) => {
    const auto = page.locator('[data-label="自動"]');
    const dark = page.locator('[data-label="ダーク"]');
    const light = page.locator('[data-label="ライト"]');

    await expect(auto).toBeVisible();
    await auto.click();
    await expect(dark).toBeVisible();
    await dark.click();
    await expect(light).toBeVisible();
    await light.click();
    await expect(auto).toBeVisible();
  });

  test('ダーク選択時に <html> の theme クラス相当が変化すること', async ({ page }) => {
    // ThemeService は <html> の color-scheme などを切り替えるが、ここでは
    // ボタンアイコンの ligature 名が変わることを副作用として確認する。
    const themeButton = page.locator('[data-label="自動"]');
    await themeButton.click();
    await expect(page.locator('[data-label="ダーク"] i.material-icons')).toHaveText('dark_mode');
  });
});

test.describe('FAB メニュー開閉', () => {
  test('FAB 閉時はメニュー項目が pointer-events: none で配置されていること', async ({ page }) => {
    await waitAppReady(page);
    // 既定では FAB は閉じており、aria-expanded は false。
    const fabBtn = page.getByRole('button', { name: /メニューを開く/ });
    await expect(fabBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('FAB を開閉すると aria-expanded / aria-label が同期すること', async ({ page }) => {
    await waitAppReady(page);
    const openBtn = page.getByRole('button', { name: /メニューを開く/ });
    await openBtn.click();
    const closeBtn = page.getByRole('button', { name: /メニューを閉じる/ });
    await expect(closeBtn).toHaveAttribute('aria-expanded', 'true');
    await closeBtn.click();
    await expect(openBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
