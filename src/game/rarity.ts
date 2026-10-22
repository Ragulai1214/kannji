import { RARITIES } from '../data/rarities.ts';
import { roll } from './random.ts';
import type { Random, Rarity } from './types.ts';

export function rollRarity(random: Random): Rarity {
  const weight = RARITIES.reduce((sum, rarity) => sum + rarity.weight, 0);
  if (weight <= 0 || RARITIES.some(rarity => rarity.weight < 0)) throw new Error('レアリティの重みが不正です。');
  let value = roll(random) * weight;
  return (RARITIES.find(entry => { value -= entry.weight; return value < 0; }) ?? RARITIES[RARITIES.length - 1]).id;
}
