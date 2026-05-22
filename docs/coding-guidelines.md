# Udonarium Axe — コーディングガイドライン

実装時の規範ルール（強制事項）と整形ルールをまとめる。
レイヤー設計や同期基盤の詳細は [architecture.md](architecture.md)、
日々の規範ハイライトは [../CLAUDE.md](../CLAUDE.md) を参照。

## コーディング規範

### コンポーネント

- `ChangeDetectionStrategy.OnPush` 必須。`@Component` には常に明示する
- `templateUrl` で外部分離。インラインテンプレートは使わない
- `styleUrls` / `styles` は使わない。Tailwind utility class をテンプレートに直接書く
  - どうしても Tailwind で表現できない場合に限り `styleUrls` を許容するが、
    現状の例外は [../src/app/features/character/game-data-element/game-data-element.component.css](../src/app/features/character/game-data-element/game-data-element.component.css) 1 ファイルのみ
  - SCSS は使わない
- **selector**: 原則 prefix なし（`game-character`, `chat-window`, `range` 等）。
  ただし汎用 UI directive は `app` prefix を付ける（`appDraggable`, `appTooltip`, `appResizable` 等）。
  既存の `app-` prefix component（`alarm-menu` 等）は historical 互換で残置

### 変更検知 / Signals

- Signals + `versionOf()` / `collectionOf()` で配線する
- `markForCheck()` 禁止
- `detectChanges()` は DOM 計測用途のみ
  （現状の使用箇所はテストヘルパー
  [../src/app/testing/panel-drag-recovery.ts](../src/app/testing/panel-drag-recovery.ts) のみ）
- `@SyncObject` 由来の値を template でリアクティブに使うときは必ず
  `versionOf(identifier)()` / `collectionOf(aliasName)()` を読んで依存配線する
- `input.required<T>()` の値をテンプレート以外で読むときは `_initialized` フラグ等で
  ガードして NG0950 を避ける

### イベント購読

- `ObjectChangeService.onObjectChangedFor()` / `onObjectChangedForAlias()` を使う
- 生の `objectChanged$.subscribe()` + 個別 identifier フィルタは漸進的に置き換え
- 詳細な使用例は [architecture.md#イベント購読パターン](architecture.md#イベント購読パターン) を参照

### feature 副作用

- 各 feature の `*-event-handler.service.ts` を `providedIn: 'root'` で書き、
  `AppComponent` から `inject()` で自動起動する
- 個別 feature 専用サービスを `app.component` に直書きしない（composition root は束ねる役のみ）

### context-menu

- 各 feature 配下に `*-context-menu.ts` を純関数で置き、spec で挙動を固定する
- コンポーネント本体は短く保つ
- 例:
  ```typescript
  export function buildXxxContextMenu(
    target: XxxModel,
    callbacks: { onShowDetail: () => void; ... }
  ): ContextMenuAction[] { ... }
  ```

### DI / ドメインモデル

- ドメインモデル（`@SyncObject` クラス）から DI サービスを呼ぶ箇所を **新規で増やさない**
- サービス側からモデルを操作する向きを保つ
- やむを得ない場合は `ServiceLocator.get<T>(token)` を使う
  ([../src/app/core/di/service-locator.ts](../src/app/core/di/service-locator.ts)) が、現状 1 箇所のみ

## コードスタイル

### TypeScript

- `strict: true`、ただし `strictPropertyInitialization: false`（`tsconfig.json`）
- `target: ES2022` / `module: es2020`
- `experimentalDecorators: true` / `useDefineForClassFields: false`

### フォーマット (Prettier)

- インデント: スペース 2、シングルクォート、`printWidth: 120`、`trailingComma: 'es5'`
- 設定: [../.prettierrc](../.prettierrc) / [../.editorconfig](../.editorconfig)
- 整形: `npm run format` / チェック: `npm run format:check`

### ESLint

- **import 順序**: `simple-import-sort` で自動整列（`npm run lint -- --fix`）
- **未使用 import / vars**: `unused-imports` プラグイン（`_` 始まりは無視）
- **相対パス import 禁止**: `no-restricted-imports` で `^\.` を拒否。
  必ずパスエイリアス (`@axe/*` / `@env/*`) を使う
- **層境界の自動検査**: `no-restricted-imports` で各レイヤーの逆流 import を error 化
  - 詳細: [architecture.md#@axe/core/\*](architecture.md#axecore) 以降の各層 / [../eslint.config.ts](../eslint.config.ts)

設定: [../eslint.config.ts](../eslint.config.ts)
