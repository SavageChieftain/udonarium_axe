# Udonarium Axe — コントリビューション規約

コミットメッセージと Git フックに関するルール。
コーディング規約は [coding-guidelines.md](coding-guidelines.md)、
アーキテクチャは [architecture.md](architecture.md) を参照。

## 基本方針

- **コミットメッセージは必ず英語** で書く
- **Conventional Commits + lefthook** で運用する
- **複数の論理的変更を 1 コミットに混ぜない**
  （バージョンバンプ・機能変更・ドキュメント整備は別コミット）

## Conventional Commits フォーマット

形式: `type(scope): subject`

### type

`feat` / `fix` / `docs` / `chore` / `style` / `refactor` / `test` / `perf` / `build` / `ci`

### scope

変更対象の領域名。よく使うもの:

| カテゴリ | scope                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| 機能     | `chat`, `tabletop`, `character`, `card`, `dice`, `lobby`, `media`, `controller`, `vote`, `inventory`, `alarm` |
| インフラ | `network`, `storage`, `sync`                                                                                  |
| レイヤー | `application`, `ui`, `domain`                                                                                 |
| その他   | `css`, `release`                                                                                              |

### subject

- 英語・命令形（`add` / `fix` / `update`）
- 冒頭小文字・末尾ピリオドなし
- 72 文字以内

### body（任意）

- 何より **「なぜ」** を書く
- 箇条書きは `- ` で始める

### footer（任意）

- `BREAKING CHANGE:` フッタは現状未使用だが、必要時はフッタとして追加

### 例

```
feat(tabletop): expand table area to 6000px and adjust zoom range
```

```
fix(chat): prevent duplicate logout message and invisible messages from late-timestamp peers

- chat tab がメッセージ受信時にローカルのみフィルタしていたため、
  P2P で受信した古いタイムスタンプメッセージが描画されない問題があった
- フィルタ判定を timestamp ではなく aliasName ベースに変更
```

```
chore(release): bump version to 1.2.2
```

## lefthook フック（迂回は手段を問わず絶対禁止）

`--no-verify` / `LEFTHOOK=0` / `core.hooksPath` の変更 / lefthook 設定の一時無効化、
**いずれも禁止**。フックが落ちたら原因を直してから再コミットする。

| フック       | 内容                               |
| ------------ | ---------------------------------- |
| `commit-msg` | `commitlint`（メッセージ形式検査） |
| `pre-commit` | `ng lint` + `ng test`（並列）      |
| `pre-push`   | `npm run build`                    |

設定: [../lefthook.yml](../lefthook.yml)

## リリース

- `package.json` の `version` がリリース番号
- 更新は `chore(release): bump version to X.Y.Z` で 1 コミットに切り出す
- 機能変更・バージョンバンプ・ドキュメント整備を同じコミットに混ぜない

## 依存の脆弱性（`npm audit`）

- **`npm audit` は 0 件を保つ**（`website/` も同じ）
- 直せるものは `overrides` に固定版を書いて上げる（`npm audit fix` に任せると別の依存まで動く）
- **`npm` は `tools/npm-stub` に差し替えてある** — `@semantic-release/npm` が同梱する npm CLI の
  `bundleDependencies`（`tar` / `undici` / `ip-address` / `brace-expansion`）は `overrides` が届かず、
  修正済みの同梱物を持つ npm もまだ出ていないため。差し替えても動く理由と戻し方は
  [tools/npm-stub/README.md](../tools/npm-stub/README.md) を参照
- **`semantic-release` を devDependencies から外さないこと** — `npx semantic-release` はローカルの解決を
  使うので、外すと `overrides` の `undici` が効かなくなり、リリース時の zip アップロードが落ちる
