import { GROUPS } from '../data/groups.ts';
import { KANJI } from '../data/kanji.ts';
import type { GroupId } from '../game/types.ts';
import { homeButton } from './shared.ts';

export function catalogScreen(): string {
  return `<section class="screen" aria-labelledby="screen-title">
    <header class="screen-header"><div><p class="eyebrow">七つの分類</p><h1 id="screen-title" tabindex="-1">漢字一覧</h1></div>${homeButton}</header>
    <p>ガチャに登場する全${KANJI.length}字。すべて最初から閲覧できます。</p>
    <nav class="group-links" aria-label="分類へ移動">${Object.entries(GROUPS).map(([id, group]) => `<a href="#group-${id}">${group.name}</a>`).join('')}</nav>
    ${Object.entries(GROUPS).map(([id, group]) => {
      const chars = KANJI.filter(char => char.group === id as GroupId);
      return `<section class="catalog-group" id="group-${id}" aria-labelledby="heading-${id}"><h2 id="heading-${id}">${group.name}<span>${chars.length}字</span></h2><ul class="kanji-grid">${chars.map(char => `<li>${char.char}</li>`).join('')}</ul></section>`;
    }).join('')}
    <p class="note">補填専用の数字「1」はガチャ対象に含みません。漢数字「一」は通常の漢字です。</p>
    ${homeButton}
  </section>`;
}
