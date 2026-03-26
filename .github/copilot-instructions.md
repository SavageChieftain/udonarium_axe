# Udonarium Axe — Copilot Instructions

Udonarium Axe はブラウザベースの TRPG オンラインセッション支援ツール。WebRTC（SkyWay SDK）によるP2P通信でサーバレスにオブジェクト同期を行う。

## アーキテクチャ

### 4層構造（`src/app/`）

| レイヤー | パス | 説明 | 依存ルール |
|----------|------|------|-----------|
| **core** | `core/` | インフラ層: network/, storage/, sync/, transform/, util/, app-wide services | 他レイヤーをimportしない |
| **domain** | `domain/` | ドメインモデル: character/, chat/, tabletop/, card/, dice/, media/, peer/, data/, shared/ | Angular無依存。`@SyncObject`/`@SyncVar`のみ |
| **features** | `features/` | UI機能単位: chat/, tabletop/, character/, card/, dice/, media/, lobby/, inventory/, vote/, alarm/, controller/, file/ | core, domain, shared に依存可 |
| **shared** | `shared/` | 横断UI: components/, directives/, pipes/, services | core, domain に依存可 |

### パスエイリアス

- `@axe/*` → `./src/app/*`（tsconfig.json）

## 技術スタック

- **Angular 21** — Zoneless (`provideZonelessChangeDetection()`)、OnPush 97%
- **Signals** — signal/computed/effect/toSignal/input + `versionOf()`/`collectionOf()` per-identifier signal API
- **テスト** — Vitest 4.1.0 + happy-dom
- **E2E** — Playwright
- **Lint** — ESLint (flat config)
- **コミット** — Conventional Commits (`@commitlint/config-conventional`) + lefthook (pre-commit: lint + test, pre-push: build)
- **P2P** — `@skyway-sdk/core` + `@msgpack/msgpack` v3

## テスト環境

### デュアルランナー

| ランナー | コマンド | ビルドツール |
|----------|----------|-------------|
| Angular builder | `npm test` (`ng test`) | `@angular/build:unit-test` + ESBuild |
| Standalone vitest | `npx vitest run` | `@analogjs/vite-plugin-angular` + Vite |

**両方のランナーでテストが通過する必要がある。**

### ESBuild 環境のモック制約

Angular builder の `@angular/build:unit-test` はESBuildでモジュールをバンドルするため、ESMモジュールの`export`が **non-configurable** になる。

**使用不可:**
- `vi.spyOn(moduleNamespace, 'exportedFunc')` — `TypeError: Cannot redefine property`
- `vi.mock(path, factory)` — ファクトリは実行されるがモジュールは置換されない
- `vi.mock('./relative/path')` — 相対importのモックは明示的に拒否される

**使用可能:**
- `vi.spyOn(classInstance, 'method')` — クラスインスタンスのプロパティは configurable
- `vi.spyOn(ClassName, 'staticMethod')` — static メソッドも configurable
- Observable の subscribe で検証
- シングルトンインスタンスのメソッドスパイ

## 変更検知パターン

### Zoneless 環境

- P2P受信時の更新: `scheduleAngularTick()` が `ApplicationRef.tick()` でグローバルCDをトリガー
- コンポーネントの再描画: getter 内で `versionOf(id)()`/`collectionOf(aliasName)()` を読み取り、signal の dirty 通知で自動再描画
- `markForCheck()` は使用しない（0箇所）
- `detectChanges()` はDOM計測用途のみ許容

### Per-Identifier Signal API（ObjectChangeService）

```typescript
// オブジェクト変更の追跡（自身 + 子孫の変更で increment）
this.objectChange.versionOf(this.gameCharacter.identifier)();

// コレクション変更の追跡（add/remove で increment）
this.objectChange.collectionOf(GameCharacter.aliasName)();
```

## ドメインモデルの制約

- `@SyncObject` クラス群は Angular DI 外（`ObjectFactory` が `new` で生成）
- DI アクセスには `ServiceLocator.get<T>(token)` ブリッジを使用（`main.ts` で初期化）
- **ドメインモデルが直接DIサービスを呼ぶ箇所を増やさないこと** — サービス側からモデルを操作する方向にする

## シリアライズの注意

- `@msgpack/msgpack` v3 は `ArrayBuffer` を正しくシリアライズできない（encode → decode で `{}` になる）
- P2Pでバイナリ送信時は `new Uint8Array(buf)` でラップ必須

## バックエンド設定

```json
{
  "backend": {
    "url": "https://udonarium-backend-vercel.vercel.app/"
  }
}
```

## 未着手作業（Phase 8 — オプション）

- `ObjectSerializer` に `toJson()` / `fromJson()` を追加し、`convertToXml` → `convertToJson` に置換
- `parseXml()` は残し、旧フォーマットの読み込みのみサポート（後方互換）
