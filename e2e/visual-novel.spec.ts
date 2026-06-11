import { expect, test } from '@playwright/test';

import { openPanel, openTableContextMenu, waitAppReady } from './helpers';

test.describe('ビジュアルノベルモード', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ui-lang', 'ja'));
    await waitAppReady(page);
    await openPanel(page, 'ノベルモード');
    await expect(page.locator('visual-novel-overlay')).toBeVisible();
  });

  test('終了ボタンでノベルモードを閉じられること', async ({ page }) => {
    await page.locator('visual-novel-overlay button[title="終了"]').click();
    await expect(page.locator('visual-novel-overlay')).toHaveCount(0);
  });

  test('入力欄から発言するとノベルウィンドウに表示されること', async ({ page }) => {
    const input = page.locator('visual-novel-overlay input[type="text"]');
    await input.fill('やあ、これはテストです');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay')).toContainText('やあ、これはテストです', { timeout: 15000 });
  });

  test('複数メッセージを履歴ナビゲーションで行き来できること', async ({ page }) => {
    const input = page.locator('visual-novel-overlay input[type="text"]');
    await input.fill('一つ目');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay')).toContainText('一つ目', { timeout: 15000 });
    await input.fill('二つ目');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay')).toContainText('二つ目', { timeout: 15000 });

    await page.locator('visual-novel-overlay button[title="前のメッセージ"]').click();
    await expect(page.locator('visual-novel-overlay')).toContainText('一つ目');
    await page.locator('visual-novel-overlay button[title="次のメッセージ"]').click();
    await expect(page.locator('visual-novel-overlay')).toContainText('二つ目', { timeout: 15000 });
  });

  test('VNモード中でもテーブルを右クリック操作できること', async ({ page }) => {
    const menu = await openTableContextMenu(page);
    await expect(menu.getByText('キャラクターを作成')).toBeVisible();
  });

  test('VNモード中でも既存パネル（接続情報）を操作できること', async ({ page }) => {
    const peerMenu = page.locator('peer-menu');
    await expect(peerMenu).toBeVisible();
    const input = peerMenu.locator('input').first();
    await input.click();
    await expect(input).toBeFocused();
  });

  test('感情表現つきの発言はチャット末尾にサフィックスが付き、VN表示では本文のみになること', async ({ page }) => {
    await page.locator('visual-novel-overlay button[title="演出"]').click();
    await page.locator('visual-novel-overlay button', { hasText: '叫び' }).click();
    await page.locator('visual-novel-overlay button', { hasText: 'ゆれ' }).click();
    await page.locator('visual-novel-overlay button[title="演出"]').click();

    const input = page.locator('visual-novel-overlay input[type="text"]');
    await input.fill('なんだって！？');
    await input.press('Enter');

    await expect(page.locator('chat-message').last()).toContainText('なんだって！？ 〔叫び・ゆれ〕', {
      timeout: 15000,
    });
    await expect(page.locator('visual-novel-overlay')).toContainText('なんだって！？', { timeout: 15000 });

    await page.locator('visual-novel-overlay button[title="演出"]').click();
    await page.locator('visual-novel-overlay button', { hasText: 'リセット' }).click();
    await page.locator('visual-novel-overlay button[title="演出"]').click();
    await expect(page.locator('visual-novel-overlay')).not.toContainText('〔叫び・ゆれ〕');
  });

  test('ダイスボットを選択してダイスロールできること（チャット機能の維持）', async ({ page }) => {
    const diceBotSelect = page.locator('visual-novel-overlay select[title="ダイスボット"]');
    await expect(diceBotSelect.locator('option').nth(1)).toBeAttached({ timeout: 15000 });

    const input = page.locator('visual-novel-overlay input[type="text"]');
    await input.fill('2d6');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay')).toContainText('2 / 2', { timeout: 20000 });
    await expect(page.locator('visual-novel-overlay img[src*="system_chang_roll"]')).toBeVisible();
    await expect(page.locator('visual-novel-overlay')).toContainText('システムちゃん');
    await expect(page.locator('chat-portrait-img img')).toHaveCount(0);
  });

  test('キャラクターのダイスコマンド発言では立ち絵も吹き出しも出ないこと', async ({ page }) => {
    await page.locator('visual-novel-overlay select[title="発言キャラクター"]').selectOption({ label: 'モンスターA' });
    const input = page.locator('visual-novel-overlay input[type="text"]');
    await input.fill('5d6');
    await input.press('Enter');

    await expect(page.locator('visual-novel-overlay img[src*="system_chang_roll"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('visual-novel-overlay')).toContainText('（モンスターA のロール）');
    await expect(page.locator('visual-novel-overlay img[alt="モンスターA"]')).toHaveCount(0);

    await page.locator('visual-novel-overlay button[title="前のメッセージ"]').click();
    await expect(page.locator('visual-novel-overlay')).toContainText('5d6');
    await expect(page.locator('visual-novel-overlay img[alt="モンスターA"]')).toHaveCount(0);
  });

  test('スロットガイドから立ち位置を直接指定できること', async ({ page }) => {
    await page.locator('visual-novel-overlay select[title="発言キャラクター"]').selectOption({ label: 'モンスターB' });
    const slotButton = page.locator('visual-novel-overlay button[title="立ち位置スロット"]');
    await expect(slotButton).toContainText('1/12');
    await slotButton.click();
    const columns = page.locator('visual-novel-overlay .pointer-events-auto.absolute.inset-x-0 > button');
    await expect(columns).toHaveCount(12);
    await columns.nth(7).click();
    await expect(slotButton).toContainText('8/12');
  });

  test('右端スロット(11/12)でも立ち絵サイズが他と同じであること', async ({ page }) => {
    const speaker = page.locator('visual-novel-overlay select[title="発言キャラクター"]');
    const input = page.locator('visual-novel-overlay input[type="text"]');
    const slotBtn = page.locator('visual-novel-overlay button[title="立ち位置スロット"]');
    const columns = page.locator('visual-novel-overlay .pointer-events-auto.absolute.inset-x-0 > button');

    await speaker.selectOption({ label: 'モンスターA' });
    await slotBtn.click();
    await columns.nth(1).click();
    await input.fill('スロット2です');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay img[alt="モンスターA"]')).toBeVisible({ timeout: 15000 });

    await speaker.selectOption({ label: 'モンスターB' });
    await slotBtn.click();
    await columns.nth(11).click();
    await input.fill('スロット12です');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay img[alt="モンスターB"]')).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(700);
    const left = await page.locator('visual-novel-overlay img[alt="モンスターA"]').boundingBox();
    const right = await page.locator('visual-novel-overlay img[alt="モンスターB"]').boundingBox();
    if (!left || !right) throw new Error('portrait not found');
    expect(Math.abs(right.width / 1.05 - left.width)).toBeLessThan(4);
  });

  test('GM の地の文とロケーション演出が表示できること', async ({ page }) => {
    await page.locator('visual-novel-overlay button[title="演出"]').click();
    await page.locator('visual-novel-overlay button', { hasText: '地の文' }).click();
    await page.locator('visual-novel-overlay button[title="演出"]').click();

    const input = page.locator('visual-novel-overlay input[type="text"]');
    await input.fill('一行は深い森へと足を踏み入れた。');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay .vn-enter-narration')).toContainText('一行は深い森へと', {
      timeout: 15000,
    });
    await expect(page.locator('chat-message').last()).toContainText('〔地の文〕');

    await page.locator('visual-novel-overlay button[title="演出"]').click();
    await page.locator('visual-novel-overlay button', { hasText: 'ロケーション' }).click();
    await page.locator('visual-novel-overlay button[title="演出"]').click();
    await input.fill('忘れられた森');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay .vn-enter-location')).toContainText('忘れられた森', {
      timeout: 15000,
    });
  });

  test('ログから発言を編集できること（本文と演出の付け直し）', async ({ page }) => {
    const input = page.locator('visual-novel-overlay input[type="text"]');
    await input.fill('もとの発言');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay')).toContainText('もとの発言', { timeout: 15000 });

    await page.locator('visual-novel-overlay button[title="ログ"]').click();
    const row = page.locator('visual-novel-overlay [data-vn-log-index="0"]');
    await row.hover();
    await row.locator('button[title="編集"]').click();

    const textarea = row.locator('textarea');
    await textarea.fill('編集後の発言');
    await row.locator('select[title="吹き出しの形"]').selectOption('thought');
    await row.getByRole('button', { name: '保存' }).click();

    await expect(row).toContainText('編集後の発言');
    await expect(row).toContainText('〔もやもや〕');
    await expect(page.locator('chat-message').last()).toContainText('編集後の発言 〔もやもや〕');
  });

  test('ログパネルをドラッグで移動できること', async ({ page }) => {
    await page.locator('visual-novel-overlay button[title="ログ"]').click();
    const handle = page.locator('visual-novel-overlay .vn-log-handle');
    const before = await handle.boundingBox();
    if (!before) throw new Error('handle not found');
    await page.mouse.move(before.x + 60, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + 60 - 120, before.y + before.height / 2 + 80, { steps: 6 });
    await page.mouse.up();
    const after = await handle.boundingBox();
    if (!after) throw new Error('handle not found after drag');
    expect(Math.abs(after.x - before.x)).toBeGreaterThan(50);
  });

  test('GM は場面転換で立ち絵と台詞を一掃できること', async ({ page }) => {
    await page.locator('peer-menu').getByRole('button', { name: 'GM', exact: true }).click();

    const speaker = page.locator('visual-novel-overlay select[title="発言キャラクター"]');
    const input = page.locator('visual-novel-overlay input[type="text"]');
    await speaker.selectOption({ label: 'モンスターA' });
    await input.fill('第一幕の発言');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay img[alt="モンスターA"]')).toBeVisible({ timeout: 15000 });

    await page.locator('visual-novel-overlay button[title="演出"]').click();
    await page.locator('visual-novel-overlay button', { hasText: '場面転換' }).click();
    await page.locator('visual-novel-overlay button[title="演出"]').click();
    await input.fill('〜その夜〜');
    await input.press('Enter');

    await expect(page.locator('visual-novel-overlay .vn-enter-scene')).toContainText('〜その夜〜', { timeout: 15000 });
    await expect(page.locator('visual-novel-overlay img[alt="モンスターA"]')).toHaveCount(0);
  });

  test('立ち絵の反転が発言に記録されて表示・履歴再現されること', async ({ page }) => {
    const speaker = page.locator('visual-novel-overlay select[title="発言キャラクター"]');
    await speaker.selectOption({ label: 'モンスターA' });
    const input = page.locator('visual-novel-overlay input[type="text"]');
    await input.fill('まっすぐ立つ');
    await input.press('Enter');
    const portrait = page.locator('visual-novel-overlay img[alt="モンスターA"]');
    await expect(portrait).toBeVisible({ timeout: 15000 });
    await expect(portrait).not.toHaveClass(/-scale-x-100/);

    const flipButton = page.locator('visual-novel-overlay button[title="立ち絵を反転"]');
    await expect(flipButton).toContainText('通常');
    await flipButton.click();
    await expect(flipButton).toContainText('反転中');

    await input.fill('ふりむく');
    await input.press('Enter');
    await expect(page.locator('chat-message').last()).toContainText('〔反転〕', { timeout: 15000 });
    await expect(portrait).toHaveClass(/-scale-x-100/);

    await page.locator('visual-novel-overlay button[title="前のメッセージ"]').click();
    await expect(portrait).not.toHaveClass(/-scale-x-100/);
  });

  test('チャットパレットの行を入力欄へ挿入できること', async ({ page }) => {
    await page.locator('visual-novel-overlay select[title="発言キャラクター"]').selectOption({ label: 'モンスターA' });
    await page.locator('visual-novel-overlay button[title="チャットパレット"]').click();
    const firstLine = page.locator('visual-novel-overlay .vn-palette-line').first();
    await expect(firstLine).toBeVisible();
    const lineText = (await firstLine.textContent())?.trim() ?? '';
    await firstLine.click();
    await expect(page.locator('visual-novel-overlay input[type="text"]')).toHaveValue(lineText);
  });

  test('SEボードに登録音声の一覧が表示されること', async ({ page }) => {
    await page.locator('visual-novel-overlay button[title="SE再生"]').click();
    await expect(page.locator('visual-novel-overlay').getByText('サウンドエフェクト')).toBeVisible();
  });

  test('オートプレイで最古から最新まで自動再生されること', async ({ page }) => {
    const input = page.locator('visual-novel-overlay input[type="text"]');
    for (const line of ['一幕', '二幕', '三幕']) {
      await input.fill(line);
      await input.press('Enter');
      await expect(page.locator('visual-novel-overlay')).toContainText(line, { timeout: 15000 });
    }

    await page.locator('visual-novel-overlay button[title="オートプレイ"]').click();
    await expect(page.locator('.vn-auto-badge')).toBeVisible();
    await expect(page.locator('visual-novel-overlay')).toContainText('1 / 3');
    await expect(page.locator('visual-novel-overlay')).toContainText('2 / 3', { timeout: 15000 });
    await expect(page.locator('visual-novel-overlay')).toContainText('3 / 3', { timeout: 15000 });
    await expect(page.locator('.vn-auto-badge')).toHaveCount(0, { timeout: 15000 });
  });

  test('オートプレイ中のクリック操作で自動再生が停止すること', async ({ page }) => {
    const input = page.locator('visual-novel-overlay input[type="text"]');
    for (const line of ['一幕', '二幕', '三幕']) {
      await input.fill(line);
      await input.press('Enter');
      await expect(page.locator('visual-novel-overlay')).toContainText(line, { timeout: 15000 });
    }

    await page.locator('visual-novel-overlay button[title="オートプレイ"]').click();
    await expect(page.locator('.vn-auto-badge')).toBeVisible();
    await page.locator('visual-novel-overlay button[title="次のメッセージ"]').click();
    await expect(page.locator('.vn-auto-badge')).toHaveCount(0);
  });

  test('発言者の選択肢にプレイヤーが含まれないこと', async ({ page }) => {
    const speaker = page.locator('visual-novel-overlay select[title="発言キャラクター"]');
    await expect(speaker.locator('option').first()).toBeAttached();
    await expect(speaker.locator('option', { hasText: 'プレイヤー' })).toHaveCount(0);
    expect((await speaker.inputValue()).length).toBeGreaterThan(0);
  });

  test('上段の再生速度スライダーとシート参照ボタンが機能すること', async ({ page }) => {
    const slider = page.locator('visual-novel-overlay [title="再生速度"] input[type="range"]');
    await expect(slider).toBeVisible();
    await slider.fill('2');
    await expect(page.locator('visual-novel-overlay [title="再生速度"]')).toContainText('×2');

    await page.locator('visual-novel-overlay select[title="発言キャラクター"]').selectOption({ label: 'モンスターA' });
    const sheetButton = page.locator('visual-novel-overlay button[title="キャラクターシート参照"]');
    await sheetButton.click();
    await expect(page.locator('game-character-sheet')).toBeVisible({ timeout: 10000 });
    await sheetButton.click();
    await expect(page.locator('game-character-sheet')).toHaveCount(0);
  });

  test('バックログから過去メッセージへジャンプできること', async ({ page }) => {
    const input = page.locator('visual-novel-overlay input[type="text"]');
    await input.fill('一つ目');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay')).toContainText('一つ目', { timeout: 15000 });
    await input.fill('二つ目');
    await input.press('Enter');
    await expect(page.locator('visual-novel-overlay')).toContainText('二つ目', { timeout: 15000 });

    await page.locator('visual-novel-overlay button[title="ログ"]').click();

    const filter = page.locator('visual-novel-overlay input[placeholder="ログを検索…"]');
    await filter.fill('二つ目');
    await expect(page.locator('visual-novel-overlay [data-vn-log-index]')).toHaveCount(1);
    await filter.fill('');
    await expect(page.locator('visual-novel-overlay [data-vn-log-index]')).toHaveCount(2);

    await page.locator('visual-novel-overlay [data-vn-log-index]').filter({ hasText: '一つ目' }).click();
    await expect(page.locator('visual-novel-overlay')).toContainText('1 / 2');
  });
});
