import type { createBattle } from '../game/battle.ts';
import { slots, homeButton } from './shared.ts';

export type Battle = ReturnType<typeof createBattle>;
export const OUTCOME = { win: '勝利', lose: '敗北', draw: '引き分け' } as const;

export function resultScreen(battle: Battle): string {
  return `<section class="screen result" aria-labelledby="screen-title">
    <p class="eyebrow">勝負の結末</p><h1 id="screen-title" tabindex="-1">${OUTCOME[battle.outcome]}</h1>
    <h2>あなたの四文字</h2>${slots(battle.player.characters)}
    <p class="result-score">${battle.player.total}<span>点</span></p>
    ${battle.player.hasFiller ? '<p class="filler-notice">数字「1」が含まれるため、合計1点。</p>' : ''}
    <p class="opponent-result">相手：${battle.enemy.characters.map(char => char.char).join('')} ／ ${battle.enemy.total}点</p>
    <p class="result-comment">${battle.comment}</p>
    <div class="home-actions"><button data-action="start">もう一度書く</button>${homeButton}</div>
  </section>`;
}
