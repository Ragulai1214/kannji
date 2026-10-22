import './styles/base.css';
import { startPrototype } from './three/prototype';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('画面の表示先が見つかりません。');
app.innerHTML = `
  <section class="setup" aria-labelledby="setup-title">
    <p class="eyebrow">開発確認 · 区切り2</p>
    <h1 id="setup-title">漢字の立体化</h1>
    <p>田・目・龍・数字の1を、4文字で一体のモデルにしています。</p>
    <div id="stage"></div>
    <p id="render-status" role="status">漢字の輪郭を読み込み中…</p>
    <div class="controls"><button id="reset-view">正面から見る</button><button id="angle-view">斜めから見る</button></div>
    <p>ドラッグで回転、ホイールまたはピンチで拡大・縮小できます。</p>
    <p class="note">穴の抜け方、文字の読みやすさ、厚みを確認する試作画面です。ゲーム本体は次の区切りから実装します。</p>
  </section>`;

let dispose: (() => void) | undefined;
let stopped = false;
const cleanup = (): void => { stopped = true; dispose?.(); };
window.addEventListener('pagehide', cleanup, { once: true });
if (import.meta.hot) import.meta.hot.dispose(cleanup);
try {
  dispose = await startPrototype(document.querySelector<HTMLElement>('#stage')!, document.querySelector<HTMLElement>('#render-status')!);
  if (stopped) dispose();
} catch (error) {
  console.error(error);
  document.querySelector<HTMLElement>('#render-status')!.textContent = '3D表示に失敗しました。WebGL対応とフォントの配信を確認してください。';
}
