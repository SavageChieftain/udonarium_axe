import { expect, Page, test } from '@playwright/test';

import { openTableContextMenu, waitAppReady } from './helpers';

test.describe('地形 (terrain) の追加コンテキスト操作', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    const tableMenu = await openTableContextMenu(page);
    await tableMenu.getByText('地形を作成').click();
    await expect(page.locator('terrain').first()).toBeAttached({ timeout: 10000 });
  });

  test('「壁を非表示」を選ぶと次回メニューに「壁を表示」が出ること', async ({ page }) => {
    await page.locator('terrain').first().dispatchEvent('contextmenu');
    await expect(page.locator('context-menu').locator('li').first()).toBeVisible({ timeout: 5000 });
    await page.locator('context-menu').getByText('壁を非表示').click();
    await page.locator('terrain').first().dispatchEvent('contextmenu');
    await expect(page.locator('context-menu').getByText('壁を表示')).toBeVisible({ timeout: 5000 });
  });

  test('「傾斜」サブメニューに 5 方向 (なし/北/東/南/西) が含まれること', async ({ page }) => {
    await page.locator('terrain').first().dispatchEvent('contextmenu');
    await expect(page.locator('context-menu').locator('li').first()).toBeVisible({ timeout: 5000 });
    await page.locator('context-menu').getByText('傾斜').hover();
    // 「○ なし」「○ 北」「○ 東」「○ 南」「○ 西」 — ラジオマークは context-menu 側で
    // 視覚ノードから strip されるので li 単位で検証する。
    const items = page.locator('context-menu li');
    for (const direction of ['なし', '北', '東', '南', '西']) {
      await expect(items.filter({ hasText: direction }).first()).toBeVisible({ timeout: 5000 });
    }
  });
});

async function createDiceOnTable(page: Page) {
  const menu = await openTableContextMenu(page);
  await menu.getByText('ダイスを作成').hover();
  await expect(menu.getByText('D6')).toBeVisible({ timeout: 5000 });
  await menu.getByText('D6').click();
  await expect(page.locator('dice-symbol').first()).toBeAttached({ timeout: 10000 });
}

test.describe('ダイスシンボル ダイス目設定サブメニュー', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    await createDiceOnTable(page);
  });

  test('「ダイス目を設定」サブメニューに数値選択肢が出ること (D6 は 1-6)', async ({ page }) => {
    await page.locator('dice-symbol').first().dispatchEvent('contextmenu');
    await expect(page.locator('context-menu').locator('li').first()).toBeVisible({ timeout: 5000 });
    await page.locator('context-menu').getByText('ダイス目を設定').hover();
    // D6 は 6 面体なので少なくとも 6 種類の選択肢が出る (◉/○ のラジオマーク付き)。
    const items = page.locator('context-menu li');
    for (const face of ['1', '2', '3', '4', '5', '6']) {
      await expect(items.filter({ hasText: new RegExp(`(?:^|\\s)${face}(?:$|\\s)`) }).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });
});

test.describe('ダイスの公開/非公開トグル', () => {
  test('「自分だけ見る」を選ぶと次回メニューに「ダイスを公開」が出ること', async ({ page }) => {
    await waitAppReady(page);
    await createDiceOnTable(page);
    await page.locator('dice-symbol').first().dispatchEvent('contextmenu');
    const menu = page.locator('context-menu');
    await expect(menu.locator('li').first()).toBeVisible({ timeout: 5000 });
    const onlyMe = menu.getByText('自分だけ見る');
    // 既に非公開なら「ダイスを公開」が見える筈なのでスキップ。
    if ((await onlyMe.count()) === 0) {
      test.skip(true, '既定で既に非公開状態のためスキップ');
    }
    await onlyMe.click();
    await page.locator('dice-symbol').first().dispatchEvent('contextmenu');
    await expect(menu.getByText('ダイスを公開')).toBeVisible({ timeout: 5000 });
  });
});
