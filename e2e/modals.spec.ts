import { expect, test } from '@playwright/test';

import { waitAppReady } from './helpers';

test.describe('アイコン変更モーダル (file-selector)', () => {
  test('「アイコンを変更する」を押すと file-selector モーダルが開けること', async ({ page }) => {
    await waitAppReady(page);
    // peer-menu 内のアバター画像 (title="アイコンを変更する") または同 aria-label のボタン。
    const trigger = page.locator('peer-menu [title="アイコンを変更する"], peer-menu [aria-label="アイコンを変更する"]');
    await trigger.first().click();
    await expect(page.locator('file-selector')).toBeVisible({ timeout: 5000 });
    // タグラジオが少なくとも 1 件居る (file-selector 内の image-chg)。
    await expect(page.locator('file-selector input[name="image-chg"]').first()).toBeAttached();
  });

  test('モーダルの×ボタンで file-selector を閉じれること', async ({ page }) => {
    await waitAppReady(page);
    const trigger = page.locator('peer-menu [title="アイコンを変更する"], peer-menu [aria-label="アイコンを変更する"]');
    await trigger.first().click();
    await expect(page.locator('file-selector')).toBeVisible({ timeout: 5000 });
    // changeIcon は isAllowedEmpty=false なので「画像なし」は出ない → モーダル
    // 共通の右上 close (i.material-icons "close") で閉じる。
    await page.locator('modal').locator('i.material-icons', { hasText: 'close' }).click();
    await expect(page.locator('file-selector')).toHaveCount(0, { timeout: 5000 });
  });

  test('モーダル外側 (背景) をクリックで file-selector を閉じれること', async ({ page }) => {
    await waitAppReady(page);
    const trigger = page.locator('peer-menu [title="アイコンを変更する"], peer-menu [aria-label="アイコンを変更する"]');
    await trigger.first().click();
    await expect(page.locator('file-selector')).toBeVisible({ timeout: 5000 });
    // 背景レイヤーは z-index:-1 でモーダル本体に視覚的に被るため、本体外側
    // (左上 5,5) を絶対座標でクリックして clickBackground を発火する。
    await page.mouse.click(5, 5);
    await expect(page.locator('file-selector')).toHaveCount(0, { timeout: 5000 });
  });
});

test.describe('チャットメッセージ編集モーダル (chat-message-fix)', () => {
  test('自分の送信メッセージにマウスをかざすと edit アイコンが現れて押すと chat-message-fix が開けること', async ({
    page,
  }) => {
    await waitAppReady(page);
    // メッセージ送信
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('編集テスト');
    await page.locator('chat-input').getByRole('button', { name: '送信' }).click();
    await expect(textarea).toHaveValue('');
    const messageRow = page.locator('chat-message', { hasText: '編集テスト' }).first();
    await expect(messageRow).toBeVisible({ timeout: 5000 });
    // 送信メッセージ内の edit icon は default opacity-0 だが click は可能 (peer-checked 不要)。
    // 直接 click でテスト。
    await messageRow.locator('i.material-icons', { hasText: 'edit' }).click({ force: true });
    await expect(page.locator('chat-message-fix')).toBeVisible({ timeout: 5000 });
    // 編集用テキストエリアに元の本文が入っている。
    await expect(page.locator('chat-message-fix textarea').first()).toHaveValue('編集テスト');
  });
});
