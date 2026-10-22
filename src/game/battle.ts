import { KANJI } from '../data/kanji.ts';
import { COMMENTS } from '../data/comments.ts';
import { RULES } from '../data/rules.ts';
import { choose } from './random.ts';
import { scoreTeam } from './scoring.ts';
import { rollRarity } from './rarity.ts';
import { convertStats } from './combat.ts';
import type { ActionResult } from './action.ts';
import type { FourCharacters, Random, Score } from './types.ts';

export function resultComment(score: Score, random: Random = Math.random, outcome: 'win' | 'lose' | 'draw' = 'draw'): string {
  return score.hasFiller ? COMMENTS.filler : choose(COMMENTS[outcome], random);
}
export function createBattle(team: FourCharacters, random: Random = Math.random) {
  const enemyTeam = Array.from({ length: RULES.teamSize }, () => ({ ...choose(KANJI, random), rarity: rollRarity(random) })) as unknown as FourCharacters;
  const player = scoreTeam(team, random);
  const enemy = scoreTeam(enemyTeam, random);
  const playerAbility = convertStats(player, random, true), enemyAbility = convertStats(enemy, random, true);
  const available = [...KANJI];
  const background = Array.from({ length: 4 }, () => { const char = choose(available, random); available.splice(available.indexOf(char), 1); return char; });
  return { player, enemy, abilities: { player: playerAbility, enemy: enemyAbility }, background, result: undefined as ActionResult | undefined, comment: '' };
}
