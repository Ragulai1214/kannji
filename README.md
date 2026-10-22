# kannji

ブラウザ向け漢字バトルゲーム。名称は仮です。
仕様は [docs/specification.md](docs/specification.md) を参照してください。

## 現在の状態

区切り1：TypeScript・Three.js・Viteの開発環境とフォントの表示確認画面。
ゲーム本体と3D漢字はまだ実装していません。

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

## Gitによる保存

Gitの操作はユーザーが手動で行います。
`node_modules/` と `dist/` は管理対象から除外し、`package-lock.json` は保存します。
