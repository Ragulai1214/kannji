import './styles/base.css';
import './styles/screens.css';
import { startApp } from './app.ts';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('画面の表示先が見つかりません。');
let dispose: (() => void) | undefined;
let stopped = false;
const cleanup = (): void => { stopped = true; dispose?.(); };
if (import.meta.hot) import.meta.hot.dispose(cleanup);
window.addEventListener('pagehide', event => { if (!event.persisted) cleanup(); });

if (new URLSearchParams(window.location.search).has('prototype')) {
  root.innerHTML = `<section class="setup"><h1>漢字の立体化</h1><div id="stage"></div><p id="render-status" role="status">読み込み中…</p><div class="controls"><button id="reset-view">正面から見る</button><button id="angle-view">斜めから見る</button></div><p>ドラッグで回転、ピンチで拡大・縮小できます。</p><a href="${import.meta.env.BASE_URL}">ホームへ戻る</a></section>`;
  try {
    const { startPrototype } = await import('./three/prototype');
    if (!stopped) {
      dispose = await startPrototype(root.querySelector<HTMLElement>('#stage')!, root.querySelector<HTMLElement>('#render-status')!);
      if (stopped) dispose();
    }
  } catch (error) {
    console.error(error);
    if (!stopped) root.querySelector<HTMLElement>('#render-status')!.textContent = '3D表示に失敗しました。WebGL対応とフォントの配信を確認してください。';
  }
} else {
  dispose = startApp(root);
}
