# kannji

ブラウザ向け漢字バトルゲーム。名称は仮です。
仕様は [docs/specification.md](docs/specification.md) を参照してください。

## 現在の状態

区切り3：漢字データ・ガチャ状態管理・得点計算・勝敗とコメントを実装済み。
画面は引き続き区切り2の「田・目・龍・1」を押し出して立体化した確認画面です。
ドラッグで4文字をまとめて回転でき、正面・斜めの表示を切り替えられます。
ホーム・ガチャ・試合などの画面への接続は、後の区切りで実装します。

## 開発（Windows / Git Bash）

検証環境：Node.js v24.11.1 / npm 11.6.2。

```bash
cd /c/dev/games/kannji
npm ci
npm run dev
```

ターミナルに表示されたURL（通常は http://127.0.0.1:5173/kannji/ ）を開きます。
終了は Ctrl+C。ポートが使用中なら、Viteが表示するURLを使ってください。

```bash
# TypeScriptの確認と公開用ビルド
npm run build

# ゲームルールのテスト（Node.js 24推奨）
npm test

# ビルド結果のローカル確認
npm run preview
```

公開用ファイルは `dist/` に生成されます。
GitHub Pages向けのbaseは `/kannji/` に設定しています。
Pages用Actionsと公開設定は後の区切りで追加します。

## フォント

ユーザー提供の Noto Serif JP Bold を使用しています。
著作権表示とSIL Open Font License 1.1は `public/fonts/OFL.txt` に同梱しています。
ライセンスはビルド時にも `dist/fonts/` へコピーされます。

3D表示には、収録250字と数字「1」の輪郭だけを抽出した
`public/fonts/kannji-outline.typeface.json`（改変フォント名：Kannji Outline）を使用します。
同じOFLライセンスを適用します。外部CDNへの依存はありません。
文字の厚みは0.16、ベベルなしの初期設定です。形状を文字ごとにキャッシュし、4文字を同じ親にまとめます。

```bash
# 全251文字の立体化と、田・目の空洞／画線の検証
node scripts/check-font.mjs
```

輪郭データは生成済みのため、通常の開発・ビルドにPythonは不要です。
フォントを変更して再生成する場合だけ、Pythonとfonttoolsが必要です。

```bash
python -m pip install fonttools
python scripts/convert-font.py
node scripts/check-font.mjs
```

## Gitによる保存

Gitの操作はユーザーが手動で行います。
`node_modules/` と `dist/` は管理対象から除外し、`package-lock.json` は保存します。

## ゲームルールと調整箇所

- `src/data/kanji.ts`：250字と所属グループ。ガチャ・敵の抽選は全字均等、重複あり。
- `src/data/groups.ts`：7グループの文字点範囲と3次元ベクトル。
- `src/data/rules.ts`：抽選回数・補填得点・組み合わせ点の倍率／係数／上限。
- `src/data/rarities.ts`：共通レアリティ抽選の重み・固定加算点・演出色。
- `src/data/comments.ts`：通常コメントと補填時の最優先コメント。

数値は初期設定です。計算の詳細と相性方式の性質は仕様書の区切り3の項を参照してください。
ルールの変更後は `npm test` と `npm run build` で確認します。
初期値の期待値を検証するテストは、意図した数値変更に合わせて更新してください。

`createGacha` → `draw` → `decide` → `getTeam` の順に4文字を確定します。
採否未決定の再抽選や完了後の抽選はエラーになります。
`createBattle` は試合開始時に一度呼び、返された得点・加点手順・結果・コメントを画面側で保持します。
再描画や加点演出のたびに呼び直しません。
数字「1」が含まれる場合は通常加点を行わず、開始時から合計1点と理由を表示します。
