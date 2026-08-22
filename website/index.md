---
layout: home
hero:
  name: Udonarium Axe
  text: Adventure. eXperience. Encore.
  tagline: 冒険を。経験に。もう一度。コマもカードもダイスもチャットも、サーバーレスの P2P 同期でブラウザだけに。
  image:
    src: /favicon.svg
    alt: Udonarium Axe のアイコン
  actions:
    - theme: brand
      text: デモを触ってみる
      link: https://axe.xelltis.com
    - theme: alt
      text: クイックスタート
      link: /guide/quickstart
    - theme: alt
      text: Udonarium Axe とは
      link: /guide/getting-started
features:
  - icon: 🎲
    title: ブラウザだけで遊べる
    details: インストールも参加者のアカウント登録も要りません。URL を開けば、その場で卓が始まります。
    link: /manual/
    linkText: 画面の見かた
  - icon: 🧩
    title: TRPG に必要な機能を一通り
    details: 地形・コマ・カード・ダイス・チャット・立ち絵・カットイン・投票、そしてセッションログの記録まで。
    link: /guide/features
    linkText: 機能の一覧
  - icon: 🛠️
    title: 自分でホストできる
    details: 小さなバックエンドを 1 つ置き、あとは静的ホスティングに載せるだけ。運用先は自分で選べます。
    link: /guide/backend
    linkText: バックエンドの選択肢
---

<HeroShot />

## まず触ってみる

準備なしで動きを確かめられる **[デモサイト](https://axe.xelltis.com)** を用意しています。
開いてルームを作れば、そのままコマを置いたりダイスを振ったりできます。
[招待リンク](/manual/roles#招待リンクで参加者を招く) を渡せば、相手も準備なしで参加できます。

::: warning デモサイトは試用の場です

- 誰でもルームを作成・参加でき、ロビーには他の人の部屋も並びます。実際のセッションには使わないでください
- データの保持や常時稼働は保証しません。予告なく停止・初期化することがあります
- 卓を回すときは [クイックスタート](/guide/quickstart) で自分の環境を用意してください

:::

## ゲームデータはサーバーを通らない

テーブル上のオブジェクトは WebRTC（SkyWay SDK v2）の P2P 通信でブラウザ間に直接同期されます。
サーバーがするのは接続の仲介と入室トークンの発行だけで、卓の中身が中央に保存されることはありません。

<NetworkDiagram />

## はじめての方へ

遊ぶには **SkyWay アカウント**・**トークン発行用バックエンド**・**フロントエンド本体**の 3 つが必要です。
[必要なもの](/guide/requirements) で全体像を確認し、次の順で進めてください。

<SetupSteps />

> 動作確認がもっとも厚いのは **デスクトップ版 Chrome** です。
> スマートフォン・タブレットでも遊べます（[専用のレイアウト](/manual/mobile)に切り替わります）。

## 次に読む

<NextCards />
