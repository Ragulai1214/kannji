import { KANJI } from '../data/kanji.ts';
import { RULES } from '../data/rules.ts';
import { choose } from './random.ts';
import { rollRarity } from './rarity.ts';
import type { FourCharacters, GachaState, Random } from './types.ts';

export function createGacha(): GachaState {
  return { draws: 0, selected: [], pending: null, complete: false };
}
export function draw(state: GachaState, random: Random = Math.random): GachaState {
  if (state.complete || state.pending || state.draws >= RULES.maxDraws) throw new Error('今は引けません。');
  return { ...state, draws: state.draws + 1, pending: { ...choose(KANJI, random), rarity: rollRarity(random) } };
}
export function decide(state: GachaState, keep: boolean): GachaState {
  if (state.complete || !state.pending) throw new Error('採否を決める文字がありません。');
  const selected = keep ? [...state.selected, state.pending] : [...state.selected];
  const complete = selected.length === RULES.teamSize || state.draws === RULES.maxDraws;
  if (complete) while (selected.length < RULES.teamSize) selected.push({ kind: 'filler', char: '1' });
  return { draws: state.draws, selected, pending: null, complete };
}
export function getTeam(state: GachaState): FourCharacters {
  if (!state.complete || state.selected.length !== RULES.teamSize) throw new Error('4文字が確定していません。');
  return [...state.selected] as unknown as FourCharacters;
}
