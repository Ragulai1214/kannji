import { REVISION } from 'three';
import './styles/base.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('画面の表示先が見つかりません。');

app.innerHTML = `
  <section class="setup" aria-labelledby="setup-title">
    <p class="eyebrow">開発確認 · 区切り1</p>
    <h1 id="setup-title">漢字バトル</h1>
    <p class="sample" aria-label="フォント表示確認：田、目、龍、数字の1">田 目 龍 1</p>
    <p>開発環境を準備しました。</p>
    <p>次の区切りで、漢字の3D立体化を確認します。</p>
    <dl>
      <div><dt>構成</dt><dd>TypeScript / Three.js / Vite</dd></div>
      <div><dt>Three.js</dt><dd>r${REVISION}</dd></div>
      <div><dt>フォント</dt><dd id="font-status" role="status">読み込み中…</dd></div>
    </dl>
    <p class="note">ゲーム名称・画面デザインは仮の状態です。</p>
  </section>
`;

const fontStatus = document.querySelector<HTMLElement>('#font-status');
try {
  const fonts = await document.fonts.load('700 32px "Noto Serif JP"', '田目龍1');
  if (fontStatus) fontStatus.textContent = fonts.length ? 'Noto Serif JP Bold 読み込み完了' : 'フォントが見つかりません';
} catch {
  if (fontStatus) fontStatus.textContent = '読み込み失敗：フォントの配置を確認してください';
}
