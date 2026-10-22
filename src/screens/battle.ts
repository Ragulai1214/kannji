import { PRESENTATION } from '../data/presentation.ts';
import { RARITIES } from '../data/rarities.ts';
import { scoreAt, stepAt } from '../game/timeline.ts';
import { homeButton } from './shared.ts';
import { OUTCOME } from './result.ts';
import type { Battle } from './result.ts';
import type { BattleVisual, Side } from '../three/battle-scene.ts';

export function battleScreen(battle: Battle): string {
  return `<section class="screen battle-screen" aria-labelledby="screen-title">
    <header class="screen-header"><div><p class="eyebrow">四文字、相まみえる</p><h1 id="screen-title" tabindex="-1">試合</h1></div>${homeButton}</header>
    <div class="arena"><div id="battle-stage"></div>
      ${(['enemy', 'player'] as const).map(side => `<div class="fighter ${side}"><p class="fighter-label">${side === 'player' ? 'あなた' : '相手'}</p><p class="fighter-word">${battle[side].characters.map(c => c.char).join('')}</p><p class="fighter-score"><strong id="${side}-score">${scoreAt(battle[side], 0)}</strong>点</p></div>`).join('')}
      <p class="duel-mark" aria-hidden="true">対</p>
    </div>
    <p id="battle-status" role="status">モデルを読み込み中…</p>
    <div class="score-details">${(['enemy', 'player'] as const).map(side => `<p><span>${side === 'player' ? 'あなた' : '相手'}</span><strong id="${side}-step">${battle[side].hasFiller ? '数字「1」が含まれるため、合計1点' : '加点を待っています'}</strong></p>`).join('')}</div>
    <p id="visual-notice" class="note"></p>
  </section>`;
}

function pause(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(false); return; }
    const abort = (): void => { clearTimeout(timer); resolve(false); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(true); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function playBattle(root: HTMLElement, battle: Battle, onComplete: () => void): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visual: BattleVisual | undefined;
  const status = root.querySelector<HTMLElement>('#battle-status')!;
  const stage = root.querySelector<HTMLElement>('#battle-stage')!;
  async function run(): Promise<void> {
    try {
      const { createBattleScene } = await import('../three/battle-scene.ts');
      if (signal.aborted) return;
      visual = await createBattleScene(stage, battle, reduced, signal);
    } catch (error) {
      if (signal.aborted) return;
      console.error(error);
      root.querySelector<HTMLElement>('#visual-notice')!.textContent = '3Dを表示できないため、文字と得点で試合を進めます。';
    }
    if (signal.aborted) return;
    status.textContent = '文字点 → 組み合わせ点 → レアリティ点の順に加算します。';
    if (!await pause(PRESENTATION.battleIntroMs, signal)) return;
    const length = Math.max(battle.player.steps.length, battle.enemy.steps.length);
    for (let index = 0; index < length; index++) {
      const messages: string[] = [];
      for (const side of ['enemy', 'player'] as const satisfies readonly Side[]) {
        const step = stepAt(battle[side], index);
        if (!step) continue;
        const text = `${step.label} ＋${step.points}点`;
        const line = root.querySelector<HTMLElement>(`#${side}-step`)!;
        line.textContent = text;
        line.className = step.rarity === 'UR' ? 'rainbow-text' : '';
        const rarity = RARITIES.find(entry => entry.id === step.rarity);
        line.style.background = rarity && rarity.id !== 'UR' ? rarity.color : '';
        root.querySelector<HTMLElement>(`#${side}-score`)!.textContent = String(scoreAt(battle[side], index + 1));
        visual?.pulse(side, step);
        messages.push(`${side === 'player' ? 'あなた' : '相手'}：${text}`);
      }
      status.textContent = messages.join(' ／ ');
      if (!await pause(PRESENTATION.scoreStepMs, signal)) return;
    }
    status.textContent = `決着：${OUTCOME[battle.outcome]}`;
    if (!await pause(PRESENTATION.decisionMs, signal)) return;
    visual?.finish(battle.outcome);
    if (!await pause(PRESENTATION.finishMs, signal)) return;
    onComplete();
  }
  void run();
  return () => { controller.abort(); visual?.dispose(); };
}
