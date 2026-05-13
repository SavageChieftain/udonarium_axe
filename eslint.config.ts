import eslint from '@eslint/js';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['projects/**/*'],
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/no-empty-lifecycle-method': 'off',
      '@angular-eslint/no-input-rename': 'off',
      '@angular-eslint/no-output-rename': 'off',
      'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true, skipComments: true }],
      '@typescript-eslint/no-unused-vars': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.',
              message: '相対パスインポートは禁止です。パスエイリアス（@axe/...）を使用してください。',
            },
          ],
        },
      ],
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
    },
  },
  {
    files: ['src/app/**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {},
  },
  /* eslint-plugin-better-tailwindcss: Tailwind class の canonical 変換 / 並び替え /
     重複削除 / 非推奨削除 / 不要空白整理を ng lint --fix で auto-fix できるようにする。
     prettier-plugin-tailwindcss が並び替えのみなのに対し、こちらは canonical class
     (gap-[6px] → gap-1.5, flex-shrink-0 → shrink-0 等) も含めて変換する。

     移行期間中の独自 CSS クラス (fab-nav / material-icons / am-root 等) に対する
     no-unknown-classes / no-conflicting-classes は移行完了まで無効化する。 */
  {
    files: ['src/app/**/*.ts', 'src/app/**/*.html'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      'better-tailwindcss/no-unknown-classes': 'off',
      'better-tailwindcss/no-conflicting-classes': 'off',
      /* prettier-plugin-tailwindcss が 1 行整形・並び替えを担当するため、
         enforce-consistent-line-wrapping と enforce-consistent-class-order を off。
         両者を有効にすると prettier vs better-tailwindcss で互いに上書きし合う。 */
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-consistent-class-order': 'off',
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'src/styles.css',
        /* rootFontSize: 16 を指定すると w-[300px] のような任意 px 値が
           Tailwind spacing scale (w-75 等) に canonical 変換される。
           index.html の <html> は browser default の 16px を継承するためこの値で正しい。 */
        rootFontSize: 16,
      },
    },
  },
  /* e2e/ ディレクトリ配下では相対インポートを許可する (e2e 用のパスエイリアスは
     未設定、かつ Playwright 設定が tsconfig 別ファイル参照のため src との切り分けが
     不要)。 */
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  prettierPlugin,
]);
