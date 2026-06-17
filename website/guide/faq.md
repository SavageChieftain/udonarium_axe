# よくある質問

## スマートフォンで遊べますか？

動作推奨環境は **デスクトップ版 Chrome** です。スマートフォンからの操作は十分にサポートされていません。

## 他のツールで作ったキャラクターを取り込めますか？

はい。**ココフォリアのコマ JSON**、**キャラクター保管所**・**キャラクターシート倉庫**の JSON / URL、
**CharaXiv** の「ココフォリア用コピー」出力から、AXE のキャラコマを生成できます。
画面左の FAB メニュー →「キャラ取り込み」から貼り付けてください。
詳しくは [キャラクターの取り込み](/manual/character-import) を参照してください。

## なぜバックエンドが必要なのですか？

P2P 接続を確立するには SkyWay の認証トークンが必要で、その発行には App ID / Secret を使った署名が必要です。
Secret をブラウザに置くわけにはいかないため、**トークンを発行する小さなバックエンドを 1 つ**用意します。
詳しくは [必要なもの](/guide/requirements) を参照してください。

## ゲームデータはサーバーに保存されますか？

いいえ。テーブル上のオブジェクトは WebRTC（SkyWay SDK v2）の P2P 通信でブラウザ間に直接同期され、
**ゲームデータが中央サーバーに保存されることはありません**。バックエンドはトークン発行のみを担います。

## 本家 Udonarium のバックエンドは使えますか？

はい。本家 [TK11235/udonarium-backend](https://github.com/TK11235/udonarium-backend) も**そのまま利用できます**。
Axe が呼び出す API（`GET /v1/status`・`POST /v1/skyway2023/token`）と完全に同一の仕様です。
選択肢の一覧は [バックエンドの選択肢](/guide/backend) にまとめています。

## どのバックエンドを選べばよいですか？

- とにかく手軽に始めたい → **Vercel Edge**（[udonarium-backend-vercel](https://github.com/SavageChieftain/udonarium-backend-vercel)）
- レンタルサーバーを持っている → **PHP 8.3 / Apache**（[udonarium_axe_backend](https://github.com/SavageChieftain/udonarium_axe_backend)）
- Cloudflare Workers / AWS Lambda / 自前 Node で運用したい → **本家バックエンド**

## 接続できないときは？

1. `https://<バックエンドのURL>/v1/status` を開いて `OK` が返るか確認する
2. バックエンドの `ACCESS_CONTROL_ALLOW_ORIGIN` が、Axe を公開している URL を許可しているか確認する
3. フロントエンドの `assets/config.json` の `backend.url` が正しいバックエンド URL を指しているか確認する

それでも解決しない場合は [GitHub の Issue](https://github.com/SavageChieftain/udonarium_axe/issues) で報告してください。
