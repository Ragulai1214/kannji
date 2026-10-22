import { KANJI } from '../data/kanji.ts';
import { COMMENTS } from '../data/comments.ts';
import { RULES } from '../data/rules.ts';
import { choose } from './random.ts';
import { scoreTeam } from './scoring.ts';
import type { FourCharacters, Random, Score } from './types.ts';

export function compareScores(player: number, enemy: number): 'win' | 'lose' | 'draw' {
  return player > enemy ? 'win' : player < enemy ? 'lose' : 'draw';
}
export function resultComment(score: Score, random: Random = Math.random): string {
  return score.hasFiller ? COMMENTS.filler : choose(COMMENTS.normal, random);
}
export function createBattle(team: FourCharacters, random: Random = Math.random) {
  const enemyTeam = Array.from({ length: RULES.teamSize }, () => choose(KANJI, random)) as unknown as FourCharacters;
  const player = scoreTeam(team, random);
  const enemy = scoreTeam(enemyTeam, random);
  return { player, enemy, outcome: compareScores(player.total, enemy.total), comment: resultComment(player, random) };
}
