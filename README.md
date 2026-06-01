# Udonarium Axe

Udonarium Axe は、ブラウザ上で動作する TRPG オンラインセッション支援ツールです。
WebRTC（SkyWay SDK v2）による P2P 通信で、サーバを介さずにテーブル上のオブジェクトをリアルタイム同期します。

[Udonarium](https://github.com/TK11235/udonarium)（TK11235）を源流とし、その派生である
[Udonarium Lily](https://github.com/entyu/udonarium_lily)（entyu）の機能・コードを受け継いだうえで、
**Angular 21 / Zoneless + Signals による実装基盤の全面的な作り直し** と独自機能を加えた派生プロジェクトです。

> 動作推奨環境はデスクトップ版 Chrome です。スマートフォンからの操作は十分にサポートされていません。

## 系譜とクレジット

本プロジェクトは以下の MIT ライセンス作品の系譜にあります（詳細は [LICENSE](LICENSE)）。

| 作品               | 作者            | リポジトリ                                         | 位置づけ                                     |
| ------------------ | --------------- | -------------------------------------------------- | -------------------------------------------- |
| **Udonarium**      | TK11235         | <https://github.com/TK11235/udonarium>             | オリジナル                                   |
| **Udonarium Lily** | entyu（円柱）   | <https://github.com/entyu/udonarium_lily>          | 派生・機能拡張版（画像タグ等のコードを継承） |
| **Udonarium Axe**  | SavageChieftain | <https://github.com/SavageChieftain/udonarium_axe> | 本リポジトリ                                 |

## オリジナル / Udonarium Lily との違い

Axe は「Lily 系の機能を受け継ぎつつ、実装基盤を現行 Angular で作り直し、独自機能を追加した版」です。

### 1. 実装基盤の刷新（最大の違い）

オリジナル / Lily は Zone.js + NgModule 構成の旧世代 Angular アプリです。Axe は次のように基盤から再設計しています。

| 観点           | Udonarium Axe                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| フレームワーク | Angular 21.2 / **Zoneless**（`provideZonelessChangeDetection()`）+ **Signals** + standalone / OnPush                           |
| アーキテクチャ | **7 層レイヤード設計**（core → domain → infrastructure → application → ui → features → composition）。依存方向を ESLint で強制 |
| P2P 通信       | **SkyWay SDK v2**（`@skyway-sdk/core`）+ msgpack シリアライズ                                                                  |
| スタイル       | **Tailwind CSS v4**（utility class をテンプレートに直書き、`styleUrls` 不使用）                                                |
| テスト         | **Vitest + happy-dom**（ユニット）/ **Playwright**（E2E）                                                                      |
| ツールチェーン | TypeScript strict / ESLint flat config / Prettier / lefthook / Conventional Commits                                            |
| リリース・配信 | **semantic-release** による自動リリース + GitHub Actions → **AWS S3 / CloudFront**（OIDC）                                     |
| 多言語         | **transloco** による i18n と言語切替 UI                                                                                        |

設計思想の詳細は [docs/architecture.md](docs/architecture.md) を参照してください。

### 2. Lily から受け継いだ機能

立ち絵差分の表示、カットイン、バフ／デバフ管理、カスタムダイス表、カウンターリモコン、画像タグなど、
Udonarium Lily で追加された機能・コードを継承しています。

### 3. Axe で追加・拡張した主な機能

壁面サーフェスや 2D 表示、複数選択・一括操作、カスタム射程シェイプ、ジュークボックス再設計、
チャットの引用 / 返信、画像 WebP 化、ダーク / ライトテーマなど、多数の機能を追加・拡張しています。

**→ 全機能の一覧は [docs/features.md](docs/features.md) を参照してください。**

> 注: 上記「2.」「3.」の切り分けは本リポジトリの LICENSE・コード・公開情報を根拠にした暫定整理です。
> Lily / オリジナルの最新版で対応済みの項目や、補足したい差分があれば反映します。

## 主な機能（共通）

テーブル（地形・マップ）、キャラクターコマ、カード／山札、ダイス（[BCDice](https://github.com/bcdice/BCDice)）、
チャットとダイスボット、立ち絵差分、カットイン、投票、タイマー／アラーム、インベントリ など。

## 開発

詳細な開発規範は [CLAUDE.md](CLAUDE.md) と [docs/](docs/) を参照してください。

```sh
npm install        # 依存インストール
npm start          # 開発サーバー（ng serve）
npm run build      # プロダクションビルド（ng build + 既定設定コピー + zip 生成）
npm test           # ユニットテスト（Vitest）
npm run lint       # ESLint
npm run format     # Prettier 整形
npm run e2e        # Playwright E2E
```

### ドキュメント

| ドキュメント                                           | 内容                               |
| ------------------------------------------------------ | ---------------------------------- |
| [CLAUDE.md](CLAUDE.md)                                 | 開発規範の最小セット（まずはここ） |
| [docs/features.md](docs/features.md)                   | Axe で追加・拡張した機能の一覧     |
| [docs/architecture.md](docs/architecture.md)           | 7 層アーキテクチャと設計思想       |
| [docs/coding-guidelines.md](docs/coding-guidelines.md) | コーディング規範・コードスタイル   |
| [docs/contribution.md](docs/contribution.md)           | コミット規約・lefthook フック      |

## ライセンス

[MIT License](LICENSE) — 上記すべての先行作品の著作権表示を含みます。
