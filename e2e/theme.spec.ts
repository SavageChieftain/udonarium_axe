import { expect, Page, test } from '@playwright/test';

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
  // ラベルは開閉で入れ替わるので、どちらでも掴める形で参照する。
  const fabButton = (page: Page) => page.getByRole('button', { name: /メニューを(開く|閉じる)/ });

  test('FAB 閉時はメニュー項目が pointer-events: none で配置されていること', async ({ page }) => {
    await waitAppReady(page);
    const fab = fabButton(page);
    await fab.click();
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[data-testid="fab-menu"] nav')).toHaveCSS('pointer-events', 'none');
  });

  test('FAB を開閉すると aria-expanded / aria-label が同期すること', async ({ page }) => {
    await waitAppReady(page);
    const fab = fabButton(page);

    // 既定は開いた状態（feat(app): default FAB to open）。
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
    await expect(fab).toHaveAccessibleName(/メニューを閉じる/);

    await fab.click();
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    await expect(fab).toHaveAccessibleName(/メニューを開く/);

    await fab.click();
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
    await expect(fab).toHaveAccessibleName(/メニューを閉じる/);
  });
});
