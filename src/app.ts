import { PRESENTATION } from './data/presentation.ts';
import { createGacha, decide, draw, getTeam } from './game/gacha.ts';
import { createBattle, resultComment } from './game/battle.ts';
import { homeScreen } from './screens/home.ts';
import { catalogScreen } from './screens/kanji-list.ts';
import { gachaScreen } from './screens/gacha.ts';
import { battleScreen, playBattle } from './screens/battle.ts';
import { resultScreen } from './screens/result.ts';
import type { Battle } from './screens/result.ts';
import { createEffects } from './audio/effects.ts';

export function startApp(root: HTMLElement): () => void {
  let screen: 'home' | 'catalog' | 'gacha' | 'battle' | 'result' = 'home';
  let battle: Battle | undefined;
  let disposeBattle: (() => void) | undefined;
  let state = createGacha();
  let revealing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const events = new AbortController();
  const audio = createEffects();
  function cancelReveal(): void {
    clearTimeout(timer);
    timer = undefined;
    revealing = false;
    disposeBattle?.();
    disposeBattle = undefined;
    audio.stop();
  }
  function render(focus?: string): void {
    root.innerHTML = `<div class="sound-toolbar"><button class="quiet" data-action="sound" aria-pressed="${audio.enabled}">効果音:${audio.enabled ? '入' : '切'}</button></div>` + (screen === 'home' ? homeScreen() : screen === 'catalog' ? catalogScreen() : screen === 'battle' ? battleScreen(battle!) : screen === 'result' ? resultScreen(battle!) : gachaScreen(state, revealing));
    root.querySelector<HTMLElement>(focus ?? '#screen-title')?.focus({ preventScroll: true });
  }
  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    if (button.dataset.action === 'sound') {
      audio.toggle(); button.textContent = `効果音:${audio.enabled ? '入' : '切'}`; button.setAttribute('aria-pressed', String(audio.enabled)); return;
    }
    void audio.unlock();
    switch (button.dataset.action) {
      case 'home':
        cancelReveal(); battle = undefined; state = createGacha(); screen = 'home'; render(); window.scrollTo(0, 0); break;
      case 'catalog':
        cancelReveal(); screen = 'catalog'; render(); window.scrollTo(0, 0); break;
      case 'start':
        cancelReveal(); void audio.unlock().then(() => audio.play('start')); battle = undefined; state = createGacha(); screen = 'gacha'; render('[data-action="draw"]'); window.scrollTo(0, 0); break;
      case 'draw':
        if (revealing || state.pending || state.complete) return;
        state = draw(state);
        audio.play('draw');
        revealing = true;
        render();
        timer = setTimeout(() => { revealing = false; timer = undefined; render('[data-action="keep"]'); audio.play(state.pending?.rarity === 'UR' || state.pending?.rarity === 'SR' ? 'rare' : 'reveal'); },
          window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : PRESENTATION.gachaRevealMs);
        break;
      case 'keep':
      case 'discard':
        if (revealing || !state.pending || state.complete) return;
        state = decide(state, button.dataset.action === 'keep');
        audio.play(button.dataset.action === 'keep' ? 'keep' : 'discard');
        if (state.complete) {
          cancelReveal();
          battle = createBattle(getTeam(state));
          screen = 'battle'; render(); window.scrollTo(0, 0);
          disposeBattle = playBattle(root, battle, result => {
            battle = { ...battle!, result, comment: resultComment(battle!.player, Math.random, result.outcome) };
            cancelReveal(); screen = 'result'; render(); audio.play(result.outcome === 'draw' ? 'tie' : result.outcome); window.scrollTo(0, 0);
          }, audio);
        } else render('[data-action="draw"]');
        break;
    }
  }, { signal: events.signal });
  render();
  return () => { cancelReveal(); audio.dispose(); events.abort(); root.replaceChildren(); };
}
