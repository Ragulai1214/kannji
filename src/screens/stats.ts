import type { Stats } from '../game/types.ts';

export const number = (value: number): string => value.toLocaleString('ja-JP');
export function statsMarkup(stats: Stats, hp: number, side: string): string {
  return `<div class="stat-numbers"><p class="stat-hp">体力:<span id="${side}-hp">${number(hp)}</span>/${number(stats.hp)}</p><p class="stat-atk">攻撃力:${number(stats.atk)}</p><p class="stat-def">防御力:${number(stats.def)}</p></div><progress class="hp-bar" id="${side}-bar" aria-label="${side === 'player' ? 'あなた' : '相手'}の体力" max="${stats.hp}" value="${hp}"></progress>`;
}
