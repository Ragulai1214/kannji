# kannji

ブラウザ向け漢字バトルゲーム。名称は仮です。
仕様は [docs/specification.md](docs/specification.md) を参照してください。

## 現在の状態

区切り2：「田・目・龍・1」を押し出して立体化した確認画面。
ドラッグで4文字をまとめて回転でき、正面・斜めの表示を切り替えられます。
ゲーム本体はまだ実装していません。

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
