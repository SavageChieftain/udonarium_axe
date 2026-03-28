# Udonarium Axe — Copilot Instructions

Udonarium Axe はブラウザベースの TRPG オンラインセッション支援ツール。
WebRTC（SkyWay SDK）によるP2P通信でサーバレスにオブジェクト同期を行う。

## 技術スタック

- **Angular 21** — Zoneless (`provideZonelessChangeDetection()`)、OnPush
- **Signals** — signal/computed/effect/toSignal/input + `versionOf()`/`collectionOf()`
- **テスト** — Vitest + happy-dom（デュアルランナー）
- **P2P** — `@skyway-sdk/core` + `@msgpack/msgpack` v3
- **コミット** — Conventional Commits + lefthook

## コードスタイル

- **TypeScript**: `strict: true`, `target: ES2022`
- **インデント**: スペース2、シングルクォート
- **import順序**: `simple-import-sort` プラグインで自動整列（`npm run lint -- --fix`）
- **未使用import**: `unused-imports` プラグインでエラー
- **整形**: Prettier（`npm run format`）
- **コンポーネントprefix**: `app`

## 開発コマンド

**主な開発コマンド**

### 開発サーバーの起動

- `npm start`: 開発サーバーを起動します。コード変更を監視し、ブラウザを自動でリロードします。

### プロダクションビルド

- `npm run build`: プロダクションビルドを実行します。最適化されたコードが生成されます。

### テスト

- `npm test`: ユニットテストを実行します。Angular builder と ESBuild を使用しています。
- `npx vitest run`: ユニットテストを実行します。Vite を使用しています。
- `npm run e2e`: Playwright を使用したE2Eテストを実行します。

## Lint とフォーマット

- `npm run lint`: ESLint を実行します。コードの品質をチェックします。
- `npm run format`: Prettier を実行します。コードを自動で整形します。

## アーキテクチャ（4層構造）

### core

- `@axe/core` — インフラ層（network, storage, sync等）。他レイヤーをimportしない。

### domain

- `@axe/domain` — ドメインモデル（character, chat, tabletop等）。Angular無依存。`@SyncObject`/`@SyncVar`のみ利用。

### features

- `@axe/features` — UI機能単位（chat, tabletop, character等）。core, domain, sharedに依存可。

### shared

- `@axe/shared` — 横断UI（components, directives, pipes等）。core, domainに依存可。

## コンポーネントパターン

```typescript
@Component({
  selector: 'app-xxx',
  templateUrl: './xxx.component.html',
  styleUrls: ['./xxx.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

- テンプレート・スタイルは外部ファイル分離（CSS、SCSSではない）
- 変更検知は `OnPush` + Signals で駆動
- `markForCheck()` は使用しない。`detectChanges()` はDOM計測用途のみ

## ドメインモデルの制約

- `@SyncObject` クラス群は Angular DI 外（`ObjectFactory` が `new` で生成）
- DI アクセスには `ServiceLocator.get<T>(token)` ブリッジを使用
- **ドメインモデルが直接DIサービスを呼ぶ箇所を増やさないこと** — サービス側からモデルを操作する
