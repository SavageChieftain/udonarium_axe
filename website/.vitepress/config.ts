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
  themeConfig: {
    nav: [
      { text: 'ガイド', link: '/guide/getting-started' },
      { text: 'バックエンド', link: '/guide/backend' },
      { text: '機能', link: '/guide/features' },
      { text: 'リリースノート', link: '/release-notes/' },
    ],
    sidebar: {
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
