# バックエンドの選択肢

Udonarium Axe は P2P 接続のために SkyWay の認証トークンを必要とし、その発行用に小さなバックエンドを 1 つ使います。
下記のいずれも Axe が呼び出す API（`GET /v1/status`・`POST /v1/skyway2023/token`）に対応しており、そのまま利用できます。
必要な環境変数（`SKYWAY_APP_ID` / `SKYWAY_SECRET` / `ACCESS_CONTROL_ALLOW_ORIGIN`）も共通です。

| バックエンド                                                                            | 実装 / 配置先                                               | こんな人に                                   | デプロイ方法                                                |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| [udonarium-backend-vercel](https://github.com/SavageChieftain/udonarium-backend-vercel) | TypeScript (Hono) / **Vercel Edge**                         | とにかく手軽に始めたい                       | ◎ README の **Deploy with Vercel** ボタンから               |
| [udonarium_axe_backend](https://github.com/SavageChieftain/udonarium_axe_backend)       | **PHP 8.3 / Apache**                                        | レンタルサーバーを持っている                 | ○ Releases の zip を展開し `.env` を設定して docroot に配置 |
| [udonarium-backend（本家）](https://github.com/TK11235/udonarium-backend)               | TypeScript (Hono) / Cloudflare Workers・AWS Lambda・Node.js | CF Workers / Lambda / 自前 Node で運用したい | ○ 各環境に自前でデプロイ（CLI）                             |

## 本家バックエンドについて

本家 [TK11235/udonarium-backend](https://github.com/TK11235/udonarium-backend) も**そのまま利用できます**。
Axe が呼び出す API（`GET /v1/status`・`POST /v1/skyway2023/token`、レスポンス `{ "token": ... }`）と
完全に同一の仕様です。Cloudflare Workers・AWS Lambda・Node.js のいずれかにデプロイしてください。

## 動作確認

デプロイ後、`https://<バックエンドのURL>/v1/status` を開いて `OK` が返れば、トークン発行が機能しています。
あとは [クイックスタート](/guide/quickstart) の手順 3 以降でフロントエンドを接続先に向けるだけです。
