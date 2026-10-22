import { ALLOCATION, COMBAT } from '../data/combat.ts';
import { ACTION } from '../data/action.ts';
import { integer } from './random.ts';
import type { Random, Score, Stats } from './types.ts';

export function convertStats(score: Score, random: Random = Math.random, action = false): { stats: Stats; multipliers: Stats } {
  if (score.hasFiller) return { stats: { hp: 1, atk: 1, def: 1 }, multipliers: { hp: 1, atk: 1, def: 1 } };
  const shares = { hp: 0, atk: 0, def: 0 };
  for (const char of score.characters) {
    if (char.kind !== 'kanji') continue;
    for (const key of ['hp', 'atk', 'def'] as const) shares[key] += ALLOCATION[char.group][key] / score.characters.length;
  }
  const stats = { hp: 0, atk: 0, def: 0 }, multipliers = { hp: 0, atk: 0, def: 0 };
  for (const key of ['hp', 'atk', 'def'] as const) {
    multipliers[key] = integer(...COMBAT.multiplier, random) / 1000;
    let base = score.total * shares[key] * COMBAT.coefficient[key];
    if (action) base = ACTION.compression[key].base + Math.sqrt(base) * ACTION.compression[key].scale;
    stats[key] = Math.max(1, Math.round(base * multipliers[key]));
  }
  return { stats, multipliers };
}
export function damage(atk: number, def: number): number {
  if (!Number.isFinite(atk) || !Number.isFinite(def) || atk < 1 || def < 1) throw new Error('能力は正の数値が必要です。');
  return Math.max(1, Math.round(atk * atk / (atk + def)));
}
