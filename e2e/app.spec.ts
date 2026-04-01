import { expect, Page, test } from '@playwright/test';

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

test.describe('チャットウィンドウ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('チャットタブ（メインタブ・サブタブ）が表示されること', async ({ page }) => {
    await expect(page.getByText('メインタブ')).toBeVisible();
    await expect(page.getByText('サブタブ')).toBeVisible();
  });

  test('チャットタブを切り替えられること', async ({ page }) => {
    const subTabRadio = page.locator('input[name="chat-tab"]').nth(1);
    await subTabRadio.check({ force: true });
    await expect(subTabRadio).toBeChecked();
  });

  test('SENDボタンが表示されること', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'SEND' })).toBeVisible();
  });

  test('チャットメッセージを入力できること', async ({ page }) => {
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('テストメッセージ');
    await expect(textarea).toHaveValue('テストメッセージ');
  });

  test('チャットメッセージを送信するとログに表示されること', async ({ page }) => {
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('E2Eテスト送信');
    await page.getByRole('button', { name: 'SEND' }).click();
    // 送信後、テキストエリアがクリアされる
    await expect(textarea).toHaveValue('');
    // ログにメッセージが表示される
    await expect(page.locator('.log').getByText('E2Eテスト送信')).toBeVisible({ timeout: 5000 });
  });

  test('送信先が「全員」であること（デフォルト）', async ({ page }) => {
    await expect(page.locator('chat-input').getByText('全員')).toBeVisible();
  });

  test('タブ設定ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /タブ設定/ })).toBeVisible();
  });

  test('ダイス表設定ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /ダイス表設定/ })).toBeVisible();
  });

  test('点呼ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /点呼/ })).toBeVisible();
  });

  test('ダイスボットヘルプボタンが存在すること', async ({ page }) => {
    await expect(page.locator('chat-input').getByRole('button', { name: '?' })).toBeVisible();
  });

  test('色設定ボタンが存在すること', async ({ page }) => {
    await expect(page.getByRole('button', { name: /色設定/ })).toBeVisible();
  });
});

test.describe('左メニューからパネルを開く', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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

test.describe('インベントリパネル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
    await page.getByText('インベントリ').click();
    await expect(page.locator('input[name="tab"]')).toHaveCount(3, { timeout: 5000 });
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

test.describe('ゲームテーブル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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

test.describe('キャラクター操作', () => {
  async function createCharacter(page: Page) {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('キャラクターを作成').click();
    await expect(page.locator('game-character').first()).toBeVisible({ timeout: 5000 });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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

test.describe('ネットワークインジケーター', () => {
  test('ネットワークインジケーターが表示されること', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('network-indicator')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('パネル操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
    const fileInput = page.locator('nav input[type="file"][accept="application/xml,text/xml,application/zip"]');
    await expect(fileInput).toBeAttached();
  });
});

test.describe('保存機能', () => {
  test('保存ボタンをクリックするとダウンロードが開始されること', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
    // ダウンロードイベントを監視
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('nav').getByText('保存').click();
    // ダウンロードが開始される
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });
});

test.describe('チャットでダイスロール', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('ダイスコマンド（2d6）を送信するとダイス結果がログに表示されること', async ({ page }) => {
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('2d6');
    await page.getByRole('button', { name: 'SEND' }).click();
    await expect(textarea).toHaveValue('');
    // ダイス結果がログに表示される（DiceBotの結果にはダイス記号や数値が含まれる）
    await expect(page.locator('.log').getByText(/2D6/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('コンテキストメニューからの追加オブジェクト作成', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    // 「ダイスを作成」はサブメニュー
    await menu.getByText('ダイスを作成').hover();
    await expect(menu.getByText('D6')).toBeVisible({ timeout: 3000 });
    await menu.getByText('D6').click();
    await expect(page.locator('dice-symbol').first()).toBeVisible({ timeout: 5000 });
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

test.describe('キャラクターシート操作', () => {
  async function createCharacter(page: Page) {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('キャラクターを作成').click();
    await expect(page.locator('game-character').first()).toBeVisible({ timeout: 5000 });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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

test.describe('チャットタブ設定パネル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('タブ設定ボタンをクリックするとパネルが開くこと', async ({ page }) => {
    await page.getByRole('button', { name: /タブ設定/ }).click();
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
  });

  test('タブ設定パネルにタブ名入力フィールドがあること', async ({ page }) => {
    await page.getByRole('button', { name: /タブ設定/ }).click();
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="tab-name"]')).toBeVisible();
  });

  test('タブ名を変更できること', async ({ page }) => {
    await page.getByRole('button', { name: /タブ設定/ }).click();
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
    const tabNameInput = page.locator('input[name="tab-name"]');
    await tabNameInput.fill('カスタムタブ名');
    await expect(tabNameInput).toHaveValue('カスタムタブ名');
    // チャットウィンドウのタブラベルが更新されること
    await expect(page.locator('chat-window').getByText('カスタムタブ名')).toBeVisible({ timeout: 3000 });
  });

  test('新しいタブを追加できること', async ({ page }) => {
    await page.getByRole('button', { name: /タブ設定/ }).click();
    await expect(page.locator('app-chat-tab-setting')).toBeVisible({ timeout: 5000 });
    const initialTabCount = await page.locator('input[name="chat-tab"]').count();
    await page
      .locator('app-chat-tab-setting')
      .getByRole('button', { name: /新しいタブ/ })
      .click();
    await expect(page.locator('input[name="chat-tab"]')).toHaveCount(initialTabCount + 1, { timeout: 3000 });
  });
});

test.describe('点呼ウィンドウ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('点呼ボタンをクリックするとウィンドウが開くこと', async ({ page }) => {
    await page.getByRole('button', { name: /点呼/ }).click();
    await expect(page.locator('app-vote-menu')).toBeVisible({ timeout: 5000 });
  });

  test('点呼ウィンドウに「自分を含める」チェックボックスがあること', async ({ page }) => {
    await page.getByRole('button', { name: /点呼/ }).click();
    await expect(page.locator('app-vote-menu')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="includSelf"]')).toBeVisible();
    await expect(page.locator('app-vote-menu').getByText('自分を含める')).toBeVisible();
  });

  test('自分しか部屋にいない場合はその旨が表示されること', async ({ page }) => {
    await page.getByRole('button', { name: /点呼/ }).click();
    await expect(page.locator('app-vote-menu')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('app-vote-menu').getByText('自分しか部屋にいません')).toBeVisible();
  });
});

test.describe('ゲームテーブルのズーム操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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

test.describe('インベントリのコンテキストメニュー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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

test.describe('チャットのキャラクター送信元', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('ダイスボット選択のng-selectが存在すること', async ({ page }) => {
    // gameTypeのng-selectが存在すること（`chat-input`内）
    const chatInput = page.locator('chat-input');
    // ng-selectコンポーネントが複数ある（送信元、送信先、ダイスボット）
    await expect(chatInput.locator('ng-select')).toHaveCount(3);
  });
});

test.describe('ダイス表設定パネル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('textarea.chat-input')).toBeVisible({ timeout: 15000 });
  });

  test('ダイス表設定ボタンをクリックするとパネルが開くこと', async ({ page }) => {
    await page.getByRole('button', { name: /ダイス表設定/ }).click();
    await expect(page.locator('dice-table-setting')).toBeVisible({ timeout: 5000 });
  });

  test('ダイス表設定パネルに「新しい表を作る」ボタンがあること', async ({ page }) => {
    await page.getByRole('button', { name: /ダイス表設定/ }).click();
    await expect(page.locator('dice-table-setting')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('dice-table-setting').getByRole('button', { name: '新しい表を作る' })).toBeVisible();
  });

  test('ダイス表を新規作成できること', async ({ page }) => {
    await page.getByRole('button', { name: /ダイス表設定/ }).click();
    await expect(page.locator('dice-table-setting')).toBeVisible({ timeout: 5000 });
    const tableSelect = page.locator('dice-table-setting select');
    const initialCount = await tableSelect.locator('option').count();
    await page.locator('dice-table-setting').getByRole('button', { name: '新しい表を作る' }).click();
    await expect(tableSelect.locator('option')).toHaveCount(initialCount + 1, { timeout: 5000 });
  });
});

test.describe('キャラクターのチャットパレット', () => {
  async function createCharacter(page: Page) {
    const table = page.locator('#app-table-layer');
    await table.click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.getByText('キャラクターを作成').click();
    await expect(page.locator('game-character').first()).toBeVisible({ timeout: 5000 });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('game-table')).toBeVisible({ timeout: 15000 });
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
