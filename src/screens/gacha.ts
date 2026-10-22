import { GROUPS } from '../data/groups.ts';
import { RULES } from '../data/rules.ts';
import type { GachaState } from '../game/types.ts';
import { homeButton, slots } from './shared.ts';

export function gachaScreen(state: GachaState, revealing: boolean): string {
  const pending = state.pending;
  const completed = state.complete;
  const filler = state.selected.some(char => char.kind === 'filler');
  return `<section class="screen" aria-labelledby="screen-title">
    <header class="screen-header"><div><p class="eyebrow">一字ずつ、選び取る</p><h1 id="screen-title" tabindex="-1">${completed ? '四文字が完成' : '漢字を書く'}</h1></div>${homeButton}</header>
    <div class="gacha-layout"><aside class="composition"><h2>あなたの四文字</h2>${slots(state.selected)}
      <div class="counters"><p>取得 <strong>${state.selected.filter(char => char.kind === 'kanji').length} / ${RULES.teamSize}</strong></p><p>残り抽選 <strong>${RULES.maxDraws - state.draws}回</strong></p></div>
      <p class="note">採用した順に左から並びます。<br>「書く」「消す」のどちらも抽選1回を使います。</p>
    </aside><div class="draw-area">
    ${completed ? `<div class="completion"><p class="eyebrow">書き上がり</p><p class="complete-word">${state.selected.map(char => char.char).join('')}</p>
      <p role="status">${filler ? '不足分を数字「1」で補填しました。数字が含まれるため、試合開始時から合計1点です。' : '4文字を取得したため、抽選は終了です。'}</p>
      <p class="development">ここまでが今回の実装範囲です。試合画面は次の区切りで追加します。</p>
      <button data-action="start">もう一度書く</button></div>` : `
      <div class="draw-paper ${revealing ? 'revealing' : ''}">
        <p class="draw-caption">${revealing ? '墨をひらく' : pending ? 'この一字を、書きますか。' : '次の一字との出会い'}</p>
        <p class="draw-character" aria-hidden="${revealing}">${revealing ? '〰' : pending?.char ?? '？'}</p>
        <p class="draw-group">${!revealing && pending ? GROUPS[pending.group].name : '　'}</p>
      </div>
      <p class="draw-status" role="status">${revealing ? '抽選中…' : pending ? `${pending.char}（${GROUPS[pending.group].name}）を引きました。書くか消すか選んでください。` : '「引く」を押してください。'}</p>
      <div class="draw-actions">${pending && !revealing ? '<button data-action="keep">書く</button><button class="secondary" data-action="discard">消す</button>' : `<button data-action="draw" ${revealing ? 'disabled' : ''}>${revealing ? '抽選中…' : '引く'}</button>`}</div>
      <p class="note">10回目の採否を決めた後、不足分は数字「1」で補填します。<br>点数とレアリティは試合で決まります。</p>`}
    </div></div>
  </section>`;
}
