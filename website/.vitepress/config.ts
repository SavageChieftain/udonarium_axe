import { defineConfig } from 'vitepress';

const repo = 'https://github.com/SavageChieftain/udonarium_axe';

export default defineConfig({
  lang: 'ja-JP',
  title: 'Udonarium Axe',
  description: 'ブラウザで動く TRPG オンラインセッション支援ツール — 利用ガイド',
  base: '/udonarium_axe/',
  cleanUrls: true,
  lastUpdated: true,
  head: [['meta', { name: 'theme-color', content: '#8b7cf6' }]],
  vite: {
    css: { postcss: { plugins: [] } },
  },
  themeConfig: {
    nav: [
      { text: 'ガイド', link: '/guide/getting-started' },
      { text: '操作マニュアル', link: '/manual/' },
      { text: 'バックエンド', link: '/guide/backend' },
      { text: 'リリースノート', link: '/release-notes/' },
    ],
    sidebar: {
      '/manual/': [
        { text: 'はじめに', items: [{ text: '画面の見かた', link: '/manual/' }] },
        {
          text: 'ロールと公開範囲',
          items: [
            { text: 'ロール（GM / PL / 見学）', link: '/manual/roles' },
            { text: '情報の公開範囲', link: '/manual/disclosure' },
            { text: 'オブジェクト一覧（GM）', link: '/manual/gm-object-list' },
          ],
        },
        {
          text: 'テーブル',
          items: [
            { text: '視点とテーブル操作', link: '/manual/tabletop' },
            { text: 'テーブル設定', link: '/manual/table-setting' },
            { text: '暗闇・視界・光源', link: '/manual/vision-lighting' },
            { text: '地形', link: '/manual/terrain' },
            { text: 'マップマスク', link: '/manual/map-mask' },
          ],
        },
        {
          text: 'オブジェクト',
          items: [
            { text: 'オブジェクトの基本操作', link: '/manual/objects' },
            { text: 'キャラクターコマ', link: '/manual/character' },
            { text: 'バフ／デバフ', link: '/manual/buff' },
            { text: 'カード', link: '/manual/cards' },
            { text: 'ダイス', link: '/manual/dice' },
            { text: '共有メモ', link: '/manual/notes' },
            { text: '射程範囲', link: '/manual/range' },
            { text: '行動順', link: '/manual/turn-order' },
          ],
        },
        {
          text: 'チャット',
          items: [
            { text: 'チャットの基本', link: '/manual/chat' },
            { text: 'ダイスボット', link: '/manual/dicebot' },
            { text: 'チャットパレット', link: '/manual/chat-palette' },
            { text: '投票・点呼', link: '/manual/vote' },
            { text: 'アラーム', link: '/manual/alarm' },
          ],
        },
        {
          text: 'メディア',
          items: [
            { text: '画像', link: '/manual/images' },
            { text: 'ジュークボックス', link: '/manual/jukebox' },
            { text: 'カットイン', link: '/manual/cut-in' },
          ],
        },
        {
          text: '管理・全体',
          items: [
            { text: 'インベントリ', link: '/manual/inventory' },
            { text: '保存と読み込み', link: '/manual/save-load' },
            { text: 'テーマ', link: '/manual/theme' },
          ],
        },
      ],
      '/release-notes/': [
        {
          text: 'リリースノート',
          items: [
            { text: '一覧', link: '/release-notes/' },
            { text: 'v1.12.1', link: '/release-notes/v1.12.1' },
            { text: 'v1.12.0', link: '/release-notes/v1.12.0' },
            { text: 'v1.11.0', link: '/release-notes/v1.11.0' },
            { text: 'v1.10.0', link: '/release-notes/v1.10.0' },
          ],
        },
      ],
      '/guide/': [
        {
          text: 'はじめに',
          items: [
            { text: 'Udonarium Axe とは', link: '/guide/getting-started' },
            { text: '必要なもの', link: '/guide/requirements' },
          ],
        },
        {
          text: '導入',
          items: [
            { text: 'クイックスタート', link: '/guide/quickstart' },
            { text: 'バックエンドの選択肢', link: '/guide/backend' },
          ],
        },
        {
          text: 'リファレンス',
          items: [
            { text: '主な機能', link: '/guide/features' },
            { text: 'よくある質問', link: '/guide/faq' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: repo }],
    editLink: {
      pattern: `${repo}/edit/main/website/:path`,
      text: 'このページを編集',
    },
    outline: { level: [2, 3], label: '目次' },
    docFooter: { prev: '前のページ', next: '次のページ' },
    lastUpdatedText: '最終更新',
    returnToTopLabel: 'トップへ戻る',
    darkModeSwitchLabel: 'テーマ',
    sidebarMenuLabel: 'メニュー',
  },
});
