import { expect, test } from '@playwright/test';

import { openPanel, waitAppReady } from './helpers';

test.describe('カットインエディタ (cut-in-editor)', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    await openPanel(page, 'カットイン');
    await expect(page.locator('app-cut-in-list')).toBeVisible({ timeout: 10000 });
    // 新規作成して右ペインのエディタを開く。
    await page.locator('app-cut-in-list button[title="新しいカットインを作る"]').click();
    await expect(page.locator('app-cut-in-list cut-in-editor')).toBeVisible({ timeout: 5000 });
  });

  test('カットイン名 / タグ名 / 表示秒数を入力できること', async ({ page }) => {
    const name = page.locator('cut-in-editor input[name="cut-in-name"]');
    const tag = page.locator('cut-in-editor input[name="cut-in-tag-name"]');
    const outTime = page.locator('cut-in-editor input[name="cut-in-out-time"]');
    await name.fill('オープニング');
    await tag.fill('BGM');
    await outTime.click();
    await outTime.press('Control+A');
    await outTime.fill('5');
    await expect(name).toHaveValue('オープニング');
    await expect(tag).toHaveValue('BGM');
    await expect(outTime).toHaveValue('5');
  });

  test('幅・高さ・X/Y 位置の数値入力が存在すること', async ({ page }) => {
    await expect(page.locator('cut-in-editor input[name="cut-in-width"]')).toBeAttached();
    await expect(page.locator('cut-in-editor input[name="cut-in-height"]')).toBeAttached();
    await expect(page.locator('cut-in-editor input[name="cut-in-x-pos-num"]')).toBeAttached();
    await expect(page.locator('cut-in-editor input[name="cut-in-y-pos-num"]')).toBeAttached();
  });

  test('「アスペクト比を保持」「ループ再生」「動画として扱う」「チャットで起動」チェックボックスがあること', async ({
    page,
  }) => {
    await expect(page.locator('cut-in-editor input[name="keepImageAspect"]')).toBeAttached();
    await expect(page.locator('cut-in-editor input[name="cutInIsLoop"]')).toBeAttached();
    await expect(page.locator('cut-in-editor input[name="cutInIsVideo"]')).toBeAttached();
    await expect(page.locator('cut-in-editor input[name="chatActivate"]')).toBeAttached();
  });

  test('「動画として扱う」を ON/OFF でフラグがトグルできること', async ({ page }) => {
    const cb = page.locator('cut-in-editor input[name="cutInIsVideo"]');
    const initialChecked = await cb.isChecked();
    await cb.click({ force: true });
    if (initialChecked) {
      await expect(cb).not.toBeChecked();
    } else {
      await expect(cb).toBeChecked();
    }
  });
});
