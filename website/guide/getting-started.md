# Udonarium Axe とは

> **AXE** — Adventure. eXperience. Encore.
> 冒険を。経験に。もう一度。

Udonarium Axe は、ブラウザ上で動作する TRPG オンラインセッション支援ツールです。
テーブル上のオブジェクト（コマ・カード・ダイスなど）は WebRTC（SkyWay SDK v2）の P2P 通信で
ブラウザ間に直接同期され、ゲームデータが中央サーバーに保存されることはありません。

[Udonarium](https://github.com/TK11235/udonarium)（TK11235）を源流とし、その派生である
[Udonarium Lily](https://github.com/entyu/udonarium_lily)（entyu）の機能・コードを受け継いだうえで、
Angular 21 / Zoneless + Signals による実装基盤の作り直しと独自機能を加えた派生プロジェクトです。

> 動作確認がもっとも厚いのは **デスクトップ版 Chrome** です。
> スマートフォン・タブレットでも遊べます（画面に合わせて[専用のレイアウト](/manual/mobile)に切り替わります）。

## 次のステップ

- [必要なもの](/guide/requirements) — 遊ぶために用意するものと全体構成
- [クイックスタート](/guide/quickstart) — 最短の導入手順
- [バックエンドの選択肢](/guide/backend) — トークン発行サーバーの選び方
- [主な機能](/guide/features) — Axe で使える機能の一覧

## 名前について

**A**dventure. e**X**perience. **E**ncore. — 冒険を、経験に、もう一度。

卓の一晩は終わりますが、記録から読み物や動画やまとめとして呼び戻せます。

## 系譜とクレジット

本プロジェクトは以下の MIT ライセンス作品の系譜にあります。
Lily で追加された立ち絵差分・カットイン・バフ／デバフ管理・画像タグ等のコードを継承し、
実装基盤を現行 Angular で作り直したうえで独自機能を加えています。

| 作品               | 作者            | リポジトリ                                         |
| ------------------ | --------------- | -------------------------------------------------- |
| **Udonarium**      | TK11235         | <https://github.com/TK11235/udonarium>             |
| **Udonarium Lily** | entyu（円柱）   | <https://github.com/entyu/udonarium_lily>          |
| **Udonarium Axe**  | SavageChieftain | <https://github.com/SavageChieftain/udonarium_axe> |

> 上記の機能の切り分けは、各リポジトリの LICENSE・コード・公開情報を根拠にした暫定整理です。
