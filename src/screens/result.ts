import type { createBattle } from '../game/battle.ts';
import { slots, homeButton } from './shared.ts';
import { number, statsMarkup } from './stats.ts';
export type Battle = ReturnType<typeof createBattle>;
export const OUTCOME = { win: '勝利', lose: '敗北', draw: '引き分け' } as const;
export function resultScreen(battle: Battle): string {
  const result = battle.result;
  if (!result) throw new Error('試合が終了していません。');
  return `<section class="screen result" aria-labelledby="screen-title"><p class="eyebrow">勝負の結末 · ${result.elapsed.toFixed(1)}秒 · ${result.hits}回命中</p><h1 id="screen-title" tabindex="-1">${OUTCOME[result.outcome]}</h1>
    <div class="result-fighters">${(['player','enemy'] as const).map(side=>`<section class="result-fighter"><h2>${side==='player'?'あなた':'相手'}の四文字</h2>${slots(battle[side].characters)}<p class="result-score">${number(battle[side].total)}<span>点</span></p>${statsMarkup(battle.abilities[side].stats,result.remaining[side],side)}${battle[side].hasFiller?'<p class="filler-notice">数字「1」が含まれるため、合計1点・能力はすべて1。</p>':''}</section>`).join('')}</div>
    <p class="result-comment">${battle.comment}</p><div class="home-actions"><button data-action="start">もう一度書く</button>${homeButton}</div></section>`;
}
