---
layout: home
hero:
  name: Udonarium Axe
  text: ブラウザで動く TRPG セッション支援ツール
  tagline: コマ・カード・ダイス・チャットを、サーバーレスの P2P 同期でブラウザだけに。
  actions:
    - theme: brand
      text: クイックスタート
      link: /guide/quickstart
    - theme: alt
      text: Udonarium Axe とは
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/SavageChieftain/udonarium_axe
features:
  - icon: 🎲
    title: ブラウザだけで遊べる
    details: テーブル上のオブジェクトは WebRTC（SkyWay SDK v2）の P2P 通信でブラウザ間に直接同期。ゲームデータが中央サーバーに保存されることはありません。
  - icon: 🧩
    title: TRPG に必要な機能を一通り
    details: 地形・マップ、キャラクターコマ、カード／山札、ダイス（BCDice）、チャットとダイスボット、立ち絵差分、カットイン、投票、タイマーなど。
  - icon: 🛠️
    title: 自分でホストできる
    details: トークン発行用の小さなバックエンドを 1 つ用意し、フロントエンドを静的ホスティングに置くだけ。Vercel・PHP・Cloudflare Workers など選べます。
---

## はじめての方へ

Udonarium Axe を遊ぶには、**SkyWay アカウント**・**トークン発行用バックエンド**・**フロントエンド本体**の 3 つが必要です。
[必要なもの](/guide/requirements) で全体像を確認し、[クイックスタート](/guide/quickstart) の手順に沿って進めてください。

> 動作推奨環境は **デスクトップ版 Chrome** です。スマートフォンからの操作は十分にサポートされていません。
