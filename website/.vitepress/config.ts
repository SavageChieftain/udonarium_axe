import { defineConfig } from 'vitepress';

const repo = 'https://github.com/SavageChieftain/udonarium_axe';
const base = '/udonarium_axe/';

export default defineConfig({
  lang: 'ja-JP',
  title: 'Udonarium Axe',
  description: 'ブラウザで動く TRPG オンラインセッション支援ツール — 利用ガイド',
  base,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}icon-180.png` }],
    ['meta', { name: 'theme-color', content: '#8b7cf6' }],
  ],
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
        {
          text: 'はじめに',
          items: [
            { text: '画面の見かた', link: '/manual/' },
            { text: 'スマートフォンで使う', link: '/manual/mobile' },
          ],
        },
        {
          text: 'ロールと公開範囲',
          items: [
            { text: 'ロール（GM / PL / 見学）', link: '/manual/roles' },
            { text: 'PL ツールバー', link: '/manual/pl-tools' },
            { text: '情報の公開範囲', link: '/manual/disclosure' },
            { text: 'オブジェクト一覧（GM）', link: '/manual/gm-object-list' },
            { text: 'マップエディター', link: '/manual/map-editor' },
          ],
        },
        {
          text: 'テーブル',
          items: [
            { text: '視点とテーブル操作', link: '/manual/tabletop' },
            { text: 'テーブル設定', link: '/manual/table-setting' },
            { text: '暗闇・視界・光源', link: '/manual/vision-lighting' },
            { text: '同行（パーティ）', link: '/manual/party' },
            { text: '地形', link: '/manual/terrain' },
            { text: 'マップマスク', link: '/manual/map-mask' },
          ],
        },
        {
          text: 'オブジェクト',
          items: [
            { text: 'オブジェクトの基本操作', link: '/manual/objects' },
            { text: 'キャラクターコマ', link: '/manual/character' },
            { text: 'キャラクターの取り込み', link: '/manual/character-import' },
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
            { text: 'チャットの特殊記法', link: '/manual/chat-syntax' },
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
            { text: 'マップ演出（エフェクト）', link: '/manual/map-effects' },
            { text: 'ビジュアルノベルモード', link: '/manual/visual-novel' },
          ],
        },
        {
          text: '管理・全体',
          items: [
            { text: 'インベントリ', link: '/manual/inventory' },
            { text: '保存と読み込み', link: '/manual/save-load' },
            { text: '接続が切れたとき', link: '/manual/connection' },
            { text: 'ココフォリアのルーム取り込み（実験的）', link: '/manual/room-import' },
            { text: 'テーマ', link: '/manual/theme' },
          ],
        },
      ],
      '/release-notes/': [
        {
          text: 'リリースノート',
          items: [
            { text: '一覧', link: '/release-notes/' },
            { text: 'v1.28.0', link: '/release-notes/v1.28.0' },
            { text: 'v1.27.0', link: '/release-notes/v1.27.0' },
            { text: 'v1.26.0', link: '/release-notes/v1.26.0' },
            { text: 'v1.25.0', link: '/release-notes/v1.25.0' },
            { text: 'v1.24.0', link: '/release-notes/v1.24.0' },
            { text: 'v1.23.1', link: '/release-notes/v1.23.1' },
            { text: 'v1.23.0', link: '/release-notes/v1.23.0' },
            { text: 'v1.22.0', link: '/release-notes/v1.22.0' },
            { text: 'v1.21.0', link: '/release-notes/v1.21.0' },
            { text: 'v1.20.0', link: '/release-notes/v1.20.0' },
            { text: 'v1.19.1', link: '/release-notes/v1.19.1' },
            { text: 'v1.19.0', link: '/release-notes/v1.19.0' },
            { text: 'v1.18.2', link: '/release-notes/v1.18.2' },
            { text: 'v1.18.1', link: '/release-notes/v1.18.1' },
            { text: 'v1.18.0', link: '/release-notes/v1.18.0' },
            { text: 'v1.17.0', link: '/release-notes/v1.17.0' },
            { text: 'v1.16.0', link: '/release-notes/v1.16.0' },
            { text: 'v1.15.0', link: '/release-notes/v1.15.0' },
            { text: 'v1.14.0', link: '/release-notes/v1.14.0' },
            { text: 'v1.13.0', link: '/release-notes/v1.13.0' },
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
