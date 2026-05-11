# Udonarium Axe — Claude Code 向け開発指示

Udonarium Axe はブラウザベースの TRPG オンラインセッション支援ツール。
WebRTC (SkyWay SDK) による P2P 通信でサーバレスにオブジェクトを同期する。

`.github/copilot-instructions.md` も同趣旨だが、本ファイルが現状実装に対する正です。

## 技術スタック

- **Angular 21.2** — Zoneless (`provideZonelessChangeDetection()`)、OnPush
- **Signals** — `signal` / `computed` / `effect` / `toSignal` / `input`、および
  プロジェクト独自の `versionOf(identifier)` / `collectionOf(aliasName)`
  ([src/app/shared/sync/object-change.service.ts](src/app/shared/sync/object-change.service.ts))
- **スタイル** — Tailwind v4 (`@tailwindcss/postcss`) を `src/styles.css` で
  `@import 'tailwindcss';` してグローバル適用。コンポーネント単位の
  CSS ファイルも併用（SCSS は使わない）
- **テスト** — Vitest + happy-dom。**2 系統の実行経路があり、同じ Vitest を呼ぶが設定は別物**:
  - `ng test` … Angular CLI の `@angular/build:unit-test` ビルダー (`runner: vitest`) +
    `tsconfig.spec.json` 経由
  - `npx vitest run` … `vitest.config.ts` + `@analogjs/vite-plugin-angular` 経由
  - 共通の setup は [src/app/testing/test-setup.ts](src/app/testing/test-setup.ts)
- **E2E** — Playwright (`npm run e2e` / `npm run e2e:ui`)
- **P2P / シリアライズ** — `@skyway-sdk/core` v2 + `@msgpack/msgpack` v3
- **ダイス** — `bcdice` v4 / **UI セレクト** — `@ng-select/ng-select`
- **コミット** — Conventional Commits + lefthook
  （**コミットメッセージは必ず英語**、後述のフォーマット参照）

### Conventional Commits フォーマット

形式: `type(scope): subject`

- **type**: `feat` / `fix` / `docs` / `chore` / `style` / `refactor` / `test` / `perf` / `build` / `ci`
- **scope**: 変更対象の領域名。よく使うもの: `chat` / `tabletop` / `character` / `card` / `dice` / `lobby` / `media` / `controller` / `vote` / `shared` / `network` / `storage` / `sync` / `css` / `release`
- **subject**: 英語・命令形（"add" / "fix" / "update"）・冒頭小文字・末尾ピリオドなし・72 文字以内
- **body** (任意): 何より「なぜ」を書く。箇条書きは `- ` で始める
- 複数の論理的変更を 1 コミットに混ぜない（バージョンバンプ・機能変更・ドキュメント整備は別コミット）
- `BREAKING CHANGE:` フッタは現状未使用だが必要時はフッタとして追加

例:

```
feat(tabletop): expand table area to 6000px and adjust zoom range
fix(chat): prevent duplicate logout message and invisible messages from late-timestamp peers
chore(release): bump version to 1.2.2
```

### lefthook フック（迂回は手段を問わず絶対禁止）

`--no-verify` / `LEFTHOOK=0` / `core.hooksPath` の変更 / lefthook 設定の一時無効化、
いずれも禁止。フックが落ちたら原因を直してから再コミットする。

- `commit-msg` … `commitlint`
- `pre-commit` … `ng lint` + `ng test`（並列）
- `pre-push` … `ng build`

## コードスタイル

- **TypeScript**: `strict: true`、ただし `strictPropertyInitialization: false`
  （`tsconfig.json`）。`target: ES2022` / `module: es2020` /
  `experimentalDecorators: true` / `useDefineForClassFields: false`
- **インデント**: スペース 2、シングルクォート、`printWidth: 120`、`trailingComma: 'es5'`
  ([.prettierrc](.prettierrc) / [.editorconfig](.editorconfig))
- **import 順序**: `simple-import-sort` で自動整列（`npm run lint -- --fix`）
- **未使用 import / vars**: `unused-imports` プラグイン
  （`_` 始まりは無視）
- **相対パス import 禁止**: ESLint の `no-restricted-imports` で `^\.` を拒否。
  必ず後述のパスエイリアス (`@axe/*` / `@env/*`) を使う
  ([eslint.config.ts](eslint.config.ts))
- **整形**: Prettier（`npm run format` / `npm run format:check`）
- **コンポーネント prefix**: `app`

## パスエイリアス

`tsconfig.json` と `vitest.config.ts` の双方で定義済み（変更時は両方を揃える）。

- `@axe/*` → `src/app/*`
- `@env/*` → `src/environments/*`

## 開発コマンド

| コマンド             | 用途                                                |
| -------------------- | --------------------------------------------------- |
| `npm start`          | 開発サーバー（`ng serve`）                          |
| `npm run build`      | プロダクションビルド（`ng build`）                  |
| `npm test`           | ユニットテスト（Angular builder + Vitest）          |
| `npx vitest run`     | ユニットテスト（直接 Vitest、上記とは別経路）       |
| `npm run e2e`        | Playwright E2E                                      |
| `npm run e2e:ui`     | Playwright UI モード                                |
| `npm run lint`       | ESLint                                              |
| `npm run format`     | Prettier 整形                                       |
| `npm run format:check` | Prettier チェックのみ                              |

## アーキテクチャ（4 層構造）

依存方向: `features` → (`shared` →) `domain` → `core`。逆流させない。

| レイヤー                  | 役割                                                         | 依存可能                         |
| ------------------------- | ------------------------------------------------------------ | -------------------------------- |
| `@axe/core/*`             | インフラ層（network, storage, sync, di, logging, input, event, transform, util） | なし                             |
| `@axe/domain/*`           | ドメインモデル（character, chat, tabletop, card, dice, vote, alarm, media, peer, data）。Angular 無依存。`@SyncObject` / `@SyncVar` のみ利用 | `core`                           |
| `@axe/shared/*`           | 横断 UI（components, directives, pipes, ui, sync, chat, inventory, tabletop） | `core`, `domain`                 |
| `@axe/features/*`         | UI 機能単位（chat, tabletop, character, card, controller, dice, file, inventory, lobby, media, vote, alarm） | `core`, `domain`, `shared`       |

エントリは [src/main.ts](src/main.ts) → [src/app/app.component.ts](src/app/app.component.ts)。

## 同期 / DI 基盤

- ドメインモデルは `@SyncObject(alias)` クラス + `@SyncVar()` プロパティで宣言
  ([src/app/core/sync/decorator.ts](src/app/core/sync/decorator.ts))
- `@SyncObject` クラス群は **Angular DI 外**（`ObjectFactory` が `new` で生成）
- それらシングルトン（`ObjectStore` / `ObjectFactory` / `ObjectSerializer` /
  `ObjectSynchronizer` / `ImageStorage` / `AudioStorage` / `FileArchiver` /
  `ChatTabList` / `Config` / `DataSummarySetting` / `TableSelecter` 等）は
  `CLASS_SINGLETON_PROVIDERS` で DI に橋渡しされている
  ([src/app/core/di/class-provider.ts](src/app/core/di/class-provider.ts))。
  Angular 側は `inject(ObjectStore)` 等で取得する
- DI 管理外のクラスから DI サービスに触る必要があるときだけ
  `ServiceLocator.get<T>(token)` を使う
  ([src/app/core/di/service-locator.ts](src/app/core/di/service-locator.ts))。
  **新規でドメインモデルから DI サービスを呼ぶ箇所を増やさないこと** —
  サービス側からモデルを操作する向きを保つ

## コンポーネントパターン

```typescript
@Component({
  selector: 'app-xxx',
  templateUrl: './xxx.component.html',
  styleUrls: ['./xxx.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

- テンプレート・スタイルは外部ファイル分離（CSS、SCSS ではない）
- 変更検知は `OnPush` + Signals で駆動
- `markForCheck()` は使わない。`detectChanges()` は DOM 計測用途のみ
  （現状の使用箇所はテストヘルパー
  [src/app/testing/panel-drag-recovery.ts](src/app/testing/panel-drag-recovery.ts) のみ）
- `@SyncObject` 由来の値を template でリアクティブに使うときは
  `versionOf()` / `collectionOf()` で signal を取り、依存配線する

## 留意事項

- `package.json` の `version` がリリース番号。更新は `chore(release): ...` で
- `ng build` の予算は initial 10MB 警告 / 15MB エラー、コンポーネント CSS は 6KB 警告 / 10KB エラー
- ドキュメントの更新ノート: [docs/update-1.2.0.md](docs/update-1.2.0.md) などに履歴あり
