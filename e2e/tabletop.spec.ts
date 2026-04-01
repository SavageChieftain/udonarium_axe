import { expect, Page, test } from '@playwright/test';

async function createCharacter(page: Page) {
  const table = page.locator('#app-table-layer');
  await table.click({ button: 'right', position: { x: 400, y: 300 } });
  const menu = page.locator('context-menu');
  await expect(menu).toBeVisible({ timeout: 3000 });
  await menu.getByText('キャラクターを作成').click();
  await expect(page.locator('game-character').first()).toBeVisible({ timeout: 5000 });
}

async function createDiceSymbol(page: Page) {
  const table = page.locator('#app-table-layer');
  await table.click({ button: 'right', position: { x: 400, y: 300 } });
  const menu = page.locator('context-menu');
  await expect(menu).toBeVisible({ timeout: 3000 });
  await menu.getByText('ダイスを作成').hover();
  await expect(menu.getByText('D6')).toBeVisible({ timeout: 3000 });
  await menu.getByText('D6').click();
  await expect(page.locator('dice-symbol').first()).toBeVisible({ timeout: 5000 });
}

test.describe('ゲームテーブル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('ゲームテーブルが中央に表示されること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await expect(table).toBeVisible();
  });

  test('テーブル上で右クリックするとコンテキストメニューが表示されること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    await expect(page.locator('context-menu')).toBeVisible({ timeout: 3000 });
  });

  test('コンテキストメニューにオブジェクト作成項目があること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    // キャラクター作成メニューがある
    await expect(menu.getByText('キャラクターを作成')).toBeVisible();
    // マップマスク作成メニューがある
    await expect(menu.getByText('マップマスクを作成')).toBeVisible();
    // 地形作成メニューがある
    await expect(menu.getByText('地形を作成')).toBeVisible();
    // 共有メモ作成メニューがある
    await expect(menu.getByText('共有メモを作成')).toBeVisible();
  });
});

test.describe('コンテキストメニューからオブジェクト作成', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('コンテキストメニューからキャラクターを作成できること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('キャラクターを作成').click();
    // キャラクターがテーブル上に追加される（game-characterコンポーネント）
    await expect(page.locator('game-character').first()).toBeVisible({ timeout: 5000 });
  });

  test('コンテキストメニューから共有メモを作成できること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('共有メモを作成').click();
    await expect(page.locator('text-note').first()).toBeVisible({ timeout: 5000 });
  });

  test('コンテキストメニューからマップマスクを作成できること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('マップマスクを作成').click();
    await expect(page.locator('game-table-mask').first()).toBeVisible({ timeout: 5000 });
  });

  test('コンテキストメニューから地形を作成できること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('地形を作成').click();
    await expect(page.locator('terrain').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('コンテキストメニューからの追加オブジェクト作成', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('トランプの山札を作成できること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('トランプの山札を作成').click();
    await expect(page.locator('card-stack').first()).toBeVisible({ timeout: 5000 });
  });

  test('ダイスシンボル（D6）を作成できること', async ({ page }) => {
    await createDiceSymbol(page);
  });

  test('射程範囲（円）を作成できること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    // 「射程範囲を作成」はサブメニュー
    await menu.getByText('射程範囲を作成').hover();
    await expect(menu.getByText('円')).toBeVisible({ timeout: 3000 });
    await menu.getByText('円').click();
    await expect(page.locator('range').first()).toBeVisible({ timeout: 5000 });
  });

  test('コンテキストメニューに射程範囲の種類が揃っていること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('射程範囲を作成').hover();
    for (const name of ['コーン', '直線', '円', '正方形', 'ダイヤ']) {
      await expect(menu.getByText(name)).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('キャラクター操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('作成したキャラクターを右クリックするとコンテキストメニューが表示されること', async ({ page }) => {
    await createCharacter(page);
    const character = page.locator('game-character').first();
    await character.click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
  });

  test('作成したキャラクターがインベントリに表示されること', async ({ page }) => {
    await createCharacter(page);
    // インベントリを開く
    await page.getByText('インベントリ').click();
    await expect(page.locator('input[name="tab"]')).toHaveCount(3, { timeout: 5000 });
    // テーブルタブにオブジェクトが1つ以上ある
    const objects = page.locator('game-object-inventory .box');
    await expect(objects.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('キャラクターシート操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('キャラクターを右クリック→詳細を表示するとシートが開くこと', async ({ page }) => {
    await createCharacter(page);
    const character = page.locator('game-character').first();
    await character.click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('詳細を表示').click();
    await expect(page.locator('game-character-sheet')).toBeVisible({ timeout: 5000 });
  });

  test('キャラクターシートに「編集切り替え」ボタンがあること', async ({ page }) => {
    await createCharacter(page);
    const character = page.locator('game-character').first();
    await character.click({ button: 'right' });
    await page.locator('context-menu').getByText('詳細を表示').click();
    await expect(page.locator('game-character-sheet')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('game-character-sheet').getByRole('button', { name: '編集切り替え' })).toBeVisible();
  });

  test('キャラクターのコピーを作れること', async ({ page }) => {
    await createCharacter(page);
    const initialCount = await page.locator('game-character').count();
    const character = page.locator('game-character').first();
    await character.click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('コピーを作る').click();
    await expect(page.locator('game-character')).toHaveCount(initialCount + 1, { timeout: 5000 });
  });

  test('キャラクターを墓場に移動するとインベントリの墓場タブに現れること', async ({ page }) => {
    await createCharacter(page);
    const character = page.locator('game-character').first();
    await character.click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('墓場に移動').click();
    // インベントリを開いて墓場タブを確認
    await page.getByText('インベントリ').click();
    await expect(page.locator('input[name="tab"]')).toHaveCount(3, { timeout: 5000 });
    const graveyardTab = page.locator('input[name="tab"]').nth(2);
    await graveyardTab.check({ force: true });
    const objects = page.locator('game-object-inventory .box');
    await expect(objects.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('ダイスシンボル操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('作成したダイスを右クリックするとコンテキストメニューが表示されること', async ({ page }) => {
    await createDiceSymbol(page);
    const dice = page.locator('dice-symbol').first();
    await dice.click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await expect(menu.getByText('ダイスを振る')).toBeVisible();
  });

  test('ダイスを振るとチャットログに結果が表示されること', async ({ page }) => {
    await createDiceSymbol(page);
    const dice = page.locator('dice-symbol').first();
    await dice.click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('ダイスを振る').click();
    // ダイスロール結果がチャットログに表示される
    await expect(page.locator('.log').getByText(/D6/i)).toBeVisible({ timeout: 10000 });
  });

  test('ダイスの詳細を表示できること', async ({ page }) => {
    await createDiceSymbol(page);
    const dice = page.locator('dice-symbol').first();
    await dice.click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('詳細を表示').click();
    await expect(page.locator('game-character-sheet')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('ゲームテーブルのズーム操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('マウスホイールでゲームテーブルがズームインすること', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    // ホイールイベント前のtransformを取得
    const initialTransform = await table.evaluate((el) => (el as HTMLElement).style.transform);
    // ゲームテーブル中央にホイールアップ（ズームイン）
    await table.dispatchEvent('wheel', { deltaY: -200, ctrlKey: false });
    await page.waitForTimeout(300);
    const afterTransform = await table.evaluate((el) => (el as HTMLElement).style.transform);
    // スケールが変化していること（transformが変わる）
    expect(afterTransform).not.toBe(initialTransform);
  });

  test('マウスホイールで縮小・拡大を繰り返してもクラッシュしないこと', async ({ page }) => {
    const table = page.locator('#app-table-layer');
    for (let i = 0; i < 5; i++) {
      await table.dispatchEvent('wheel', { deltaY: -200 });
    }
    for (let i = 0; i < 5; i++) {
      await table.dispatchEvent('wheel', { deltaY: 200 });
    }
    // クラッシュしないことを確認
    await expect(page.locator('game-table')).toBeVisible();
  });
});

test.describe('キャラクターのチャットパレット', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ui-panel')).toBeVisible({ timeout: 15000 });
  });

  test('チャットパレットを表示できること', async ({ page }) => {
    await createCharacter(page);
    const character = page.locator('game-character').first();
    await character.click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('チャットパレットを表示').click();
    await expect(page.locator('chat-palette')).toBeVisible({ timeout: 5000 });
  });

  test('リモコンを表示できること', async ({ page }) => {
    await createCharacter(page);
    const character = page.locator('game-character').first();
    await character.click({ button: 'right' });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('リモコンを表示').click();
    await expect(page.locator('remote-controller')).toBeVisible({ timeout: 5000 });
  });
});
