# バックエンドの選択肢

Udonarium Axe は P2P 接続のために SkyWay の認証トークンを必要とし、その発行用に小さなバックエンドを 1 つ使います。
下記のいずれも Axe が呼び出す API（`GET /v1/status`・`POST /v1/skyway2023/token`）に対応しており、そのまま利用できます。
必要な環境変数（`SKYWAY_APP_ID` / `SKYWAY_SECRET` / `ACCESS_CONTROL_ALLOW_ORIGIN`）も共通です。

<div class="choice">

**[udonarium-backend-vercel](https://github.com/Xelltis/udonarium-backend-vercel)** <span class="choice__tag">いちばん手軽</span>

TypeScript (Hono) を **Vercel Edge** で動かします。README の **Deploy with Vercel** ボタンを押すだけで
配置でき、サーバーを自分で用意する必要がありません。まず動かしてみたいならこれです。

</div>

<div class="choice">

**[udonarium_axe_backend](https://github.com/Xelltis/udonarium_axe_backend)** <span class="choice__tag">レンタルサーバー向け</span>

**PHP 8.3 / Apache** で動きます。Releases の zip を展開し、`.env` を設定して docroot に置くだけです。
すでに借りているサーバーがあるなら、契約を増やさずに済みます。

</div>

<div class="choice">

**[udonarium-backend（本家）](https://github.com/TK11235/udonarium-backend)** <span class="choice__tag">自前で運用</span>

TypeScript (Hono) を Cloudflare Workers・AWS Lambda・Node.js のいずれかへ CLI でデプロイします。
動かす場所を自分で決めたいときに向きます。

</div>

## 本家バックエンドについて

本家 [TK11235/udonarium-backend](https://github.com/TK11235/udonarium-backend) も**そのまま利用できます**。
Axe が呼び出す API（`GET /v1/status`・`POST /v1/skyway2023/token`、レスポンス `{ "token": ... }`）と
完全に同一の仕様です。Cloudflare Workers・AWS Lambda・Node.js のいずれかにデプロイしてください。

## 動作確認

デプロイ後、`https://<バックエンドのURL>/v1/status` を開いて `OK` が返れば、トークン発行が機能しています。
あとは [クイックスタート](/guide/quickstart) の手順 3 以降でフロントエンドを接続先に向けるだけです。
