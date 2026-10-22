import { RULES } from '../data/rules.ts';
import type { Character } from '../game/types.ts';

export function slots(characters: readonly Character[]): string {
  return `<ol class="slots" aria-label="取得した文字（左から取得順）">${Array.from({ length: RULES.teamSize }, (_, i) => {
    const char = characters[i];
    return `<li class="slot ${char?.kind === 'filler' ? 'filler' : ''}" aria-label="${i + 1}文字目：${char?.char ?? '未取得'}">${char?.char ?? '<span class="empty">―</span>'}</li>`;
  }).join('')}</ol>`;
}
export const homeButton = '<button class="quiet" data-action="home">ホーム</button>';
