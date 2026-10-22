import { PRESENTATION } from './data/presentation.ts';
import { createGacha, decide, draw, getTeam } from './game/gacha.ts';
import { createBattle } from './game/battle.ts';
import { homeScreen } from './screens/home.ts';
import { catalogScreen } from './screens/kanji-list.ts';
import { gachaScreen } from './screens/gacha.ts';
import { battleScreen, playBattle } from './screens/battle.ts';
import { resultScreen } from './screens/result.ts';
import type { Battle } from './screens/result.ts';

export function startApp(root: HTMLElement): () => void {
  let screen: 'home' | 'catalog' | 'gacha' | 'battle' | 'result' = 'home';
  let battle: Battle | undefined;
  let disposeBattle: (() => void) | undefined;
  let state = createGacha();
  let revealing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const events = new AbortController();
  function cancelReveal(): void {
    clearTimeout(timer);
    timer = undefined;
    revealing = false;
    disposeBattle?.();
    disposeBattle = undefined;
  }
  function render(focus?: string): void {
    root.innerHTML = screen === 'home' ? homeScreen() : screen === 'catalog' ? catalogScreen() : screen === 'battle' ? battleScreen(battle!) : screen === 'result' ? resultScreen(battle!) : gachaScreen(state, revealing);
    root.querySelector<HTMLElement>(focus ?? '#screen-title')?.focus({ preventScroll: true });
  }
  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    switch (button.dataset.action) {
      case 'home':
        cancelReveal(); battle = undefined; state = createGacha(); screen = 'home'; render(); window.scrollTo(0, 0); break;
      case 'catalog':
        cancelReveal(); screen = 'catalog'; render(); window.scrollTo(0, 0); break;
      case 'start':
        cancelReveal(); battle = undefined; state = createGacha(); screen = 'gacha'; render('[data-action="draw"]'); window.scrollTo(0, 0); break;
      case 'draw':
        if (revealing || state.pending || state.complete) return;
        state = draw(state);
        revealing = true;
        render();
        timer = setTimeout(() => { revealing = false; timer = undefined; render('[data-action="keep"]'); },
          window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : PRESENTATION.gachaRevealMs);
        break;
      case 'keep':
      case 'discard':
        if (revealing || !state.pending || state.complete) return;
        state = decide(state, button.dataset.action === 'keep');
        if (state.complete) {
          cancelReveal();
          battle = createBattle(getTeam(state));
          screen = 'battle'; render(); window.scrollTo(0, 0);
          disposeBattle = playBattle(root, battle, () => {
            cancelReveal(); screen = 'result'; render(); window.scrollTo(0, 0);
          });
        } else render('[data-action="draw"]');
        break;
    }
  }, { signal: events.signal });
  render();
  return () => { cancelReveal(); events.abort(); root.replaceChildren(); };
}
