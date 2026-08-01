---
layout: home
hero:
  name: Udonarium Axe
  text: ブラウザで動く TRPG セッション支援ツール
  tagline: コマ・カード・ダイス・チャットを、サーバーレスの P2P 同期でブラウザだけに。
  actions:
    - theme: brand
      text: デモを触ってみる
      link: https://demo.savage-tribe.com
    - theme: alt
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

## まず触ってみる

準備なしで動きを確かめられる **[デモサイト](https://demo.savage-tribe.com)** を用意しています。
開いてルームを作れば、そのままコマを置いたりダイスを振ったりできます。
[招待リンク](/manual/roles#招待リンクで参加者を招く) を渡せば、相手も同じように準備なしで参加できます。

::: warning デモサイトの位置づけ
動作を確かめるための場所です。次の点に注意してください。

- **誰でもルームを作成・参加できます。**ロビーには他の人が作ったルームも並びます。実際のセッションや、見られたくない内容を置かないでください
- **データの保持や常時稼働は保証しません。**予告なく停止・初期化することがあります
- 実際に卓を回すときは、[クイックスタート](/guide/quickstart) の手順で**自分の環境を用意**してください

:::

## はじめての方へ

Udonarium Axe を遊ぶには、**SkyWay アカウント**・**トークン発行用バックエンド**・**フロントエンド本体**の 3 つが必要です。
[必要なもの](/guide/requirements) で全体像を確認し、[クイックスタート](/guide/quickstart) の手順に沿って進めてください。

> 動作確認がもっとも厚いのは **デスクトップ版 Chrome** です。
> スマートフォン・タブレットでも遊べます（画面に合わせて[専用のレイアウト](/manual/mobile)に切り替わります）。
