# Udonarium Axe

Udonarium Axe は、ブラウザ上で動作する TRPG オンラインセッション支援ツールです。
テーブル上のオブジェクト（コマ・カード・ダイスなど）は WebRTC（SkyWay SDK v2）の P2P 通信で
ブラウザ間に直接同期され、ゲームデータが中央サーバーに保存されることはありません。

[Udonarium](https://github.com/TK11235/udonarium)（TK11235）を源流とし、その派生である
[Udonarium Lily](https://github.com/entyu/udonarium_lily)（entyu）の機能・コードを受け継いだうえで、
Angular 21 / Zoneless + Signals による実装基盤の作り直しと独自機能を加えた派生プロジェクトです。

> 動作推奨環境は **デスクトップ版 Chrome** です。スマートフォンからの操作は十分にサポートされていません。

## 必要なもの（バックエンドが要ります）

ゲームデータ自体はブラウザ同士の P2P でやり取りしますが、その P2P 接続を確立するには
SkyWay の **認証トークン** が必要です。トークンの発行には SkyWay の App ID / Secret を使った署名が必要で、
Secret をブラウザに置くわけにはいかないため、**トークンを発行する小さなバックエンドを 1 つ用意する** 必要があります。

```
ブラウザ (Udonarium Axe) ──┬─→ バックエンド（トークン発行のみ）──→ SkyWay
                           │
                           └────────── P2P (WebRTC) ──────────→ 他のプレイヤーのブラウザ
```

つまり遊ぶには次の 3 つが必要です。

1. **SkyWay アカウント**（App ID / Secret。無料枠あり）
2. **バックエンド**（トークン発行用。下記から 1 つ選んでデプロイ）
3. **フロントエンド本体**（この成果物を静的ホスティングに配置）

## クイックスタート

1. **SkyWay でアプリを作成**
   [SkyWay](https://skyway.ntt.com/) でアカウントを作成し、アプリケーションを 1 つ作成して
   **App ID** と **Secret** を控えます。

2. **バックエンドをデプロイ**
   下の [バックエンドの選択肢](#バックエンドの選択肢) から 1 つ選んでデプロイし、次の環境変数を設定します。
   - `SKYWAY_APP_ID` … 手順 1 の App ID
   - `SKYWAY_SECRET` … 手順 1 の Secret
   - `ACCESS_CONTROL_ALLOW_ORIGIN` … Axe を公開する URL（例: `https://your-axe.example.com`。`*` で全許可）

   ブラウザや `curl` で `https://<バックエンドのURL>/v1/status` を開き、`OK` が返れば成功です。

3. **フロントエンドを配置**
   [Releases](https://github.com/SavageChieftain/udonarium_axe/releases) の `axe_x.y.z.zip` を展開し
   （または自分でビルドした `dist/` を使い）、中身を任意の静的ホスティング
   （Cloudflare Pages / Amazon S3 / レンタルサーバー など）に置きます。

4. **接続先を設定**
   配置したファイルの `assets/config.json` を開き、`backend.url` を手順 2 のバックエンド URL に書き換えます。

   ```json
   {
     "backend": {
       "url": "https://<バックエンドのURL>"
     }
   }
   ```

5. **Chrome で開く**
   配置先の URL をデスクトップ版 Chrome で開き、ルームを作成すればセッションを開始できます。
   同じ URL を共有された参加者が同じルームに入ると、テーブルが同期されます。

## バックエンドの選択肢

いずれも Axe が呼び出す API（`GET /v1/status`・`POST /v1/skyway2023/token`）に対応しており、そのまま利用できます。
必要な環境変数（`SKYWAY_APP_ID` / `SKYWAY_SECRET` / `ACCESS_CONTROL_ALLOW_ORIGIN`）も共通です。

| バックエンド                                                                            | 実装 / 配置先                                               | こんな人に                                   | デプロイ方法                                                |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| [udonarium-backend-vercel](https://github.com/SavageChieftain/udonarium-backend-vercel) | TypeScript (Hono) / **Vercel Edge**                         | とにかく手軽に始めたい                       | ◎ README の **Deploy with Vercel** ボタンから               |
| [udonarium_axe_backend](https://github.com/SavageChieftain/udonarium_axe_backend)       | **PHP 8.3 / Apache**                                        | レンタルサーバーを持っている                 | ○ Releases の zip を展開し `.env` を設定して docroot に配置 |
| [udonarium-backend（本家）](https://github.com/TK11235/udonarium-backend)               | TypeScript (Hono) / Cloudflare Workers・AWS Lambda・Node.js | CF Workers / Lambda / 自前 Node で運用したい | ○ 各環境に自前でデプロイ（CLI）                             |

> 本家 [TK11235/udonarium-backend](https://github.com/TK11235/udonarium-backend) も **そのまま利用できます**。
> Axe が呼び出す API（`GET /v1/status`・`POST /v1/skyway2023/token`、レスポンス `{ "token": ... }`）と
> 完全に同一の仕様です。Cloudflare Workers・AWS Lambda・Node.js のいずれかにデプロイしてください。

## 主な機能

テーブル（地形・マップ）、キャラクターコマ、カード／山札、ダイス（[BCDice](https://github.com/bcdice/BCDice)）、
チャットとダイスボット、立ち絵差分、カットイン、投票、タイマー／アラーム、インベントリ などに加え、
壁面サーフェスや 2D 表示、複数選択・一括操作、カスタム射程シェイプ、ジュークボックス、チャットの引用 / 返信、
ダーク / ライトテーマなど Axe 独自の機能を備えています。

**→ 追加・拡張機能の一覧は [docs/features.md](docs/features.md) を参照してください。**

## 系譜とクレジット

本プロジェクトは以下の MIT ライセンス作品の系譜にあります（詳細は [LICENSE](LICENSE)）。
Lily で追加された立ち絵差分・カットイン・バフ／デバフ管理・画像タグ等のコードを継承し、
実装基盤を現行 Angular で作り直したうえで独自機能を加えています。

| 作品               | 作者            | リポジトリ                                         | 位置づけ                                     |
| ------------------ | --------------- | -------------------------------------------------- | -------------------------------------------- |
| **Udonarium**      | TK11235         | <https://github.com/TK11235/udonarium>             | オリジナル                                   |
| **Udonarium Lily** | entyu（円柱）   | <https://github.com/entyu/udonarium_lily>          | 派生・機能拡張版（画像タグ等のコードを継承） |
| **Udonarium Axe**  | SavageChieftain | <https://github.com/SavageChieftain/udonarium_axe> | 本リポジトリ                                 |

> 注: 上記の機能の切り分けは本リポジトリの LICENSE・コード・公開情報を根拠にした暫定整理です。

## 開発

```sh
npm install        # 依存インストール
npm start          # 開発サーバー（ng serve）
npm run build      # プロダクションビルド（dist/ と axe_x.y.z.zip を生成）
npm test           # ユニットテスト（Vitest）
npm run lint       # ESLint
npm run e2e        # Playwright E2E
```

開発サーバーは既定で SkyWay バックエンドの URL を `assets/config.json`（`http://localhost:3000`）から読み込みます。
ローカルで動かす場合はバックエンドをローカル起動するか、`assets/config.json` を公開済みバックエンドに向けてください。

詳細な開発規範は以下を参照してください。

| ドキュメント                                           | 内容                               |
| ------------------------------------------------------ | ---------------------------------- |
| [CLAUDE.md](CLAUDE.md)                                 | 開発規範の最小セット（まずはここ） |
| [docs/features.md](docs/features.md)                   | Axe で追加・拡張した機能の一覧     |
| [docs/architecture.md](docs/architecture.md)           | 7 層アーキテクチャと設計思想       |
| [docs/coding-guidelines.md](docs/coding-guidelines.md) | コーディング規範・コードスタイル   |
| [docs/contribution.md](docs/contribution.md)           | コミット規約・lefthook フック      |

## ライセンス

[MIT License](LICENSE) — 上記すべての先行作品の著作権表示を含みます。
