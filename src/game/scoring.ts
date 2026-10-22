import { GROUPS } from '../data/groups.ts';
import { RARITIES } from '../data/rarities.ts';
import { RULES } from '../data/rules.ts';
import { integer, roll } from './random.ts';
import type { FourCharacters, Kanji, Random, Score, ScoreStep, Vector } from './types.ts';

function similarity(a: Vector, b: Vector): number {
  const divisor = Math.hypot(...a) * Math.hypot(...b);
  if (!divisor) throw new Error('属性ベクトルをゼロにできません。');
  return a.reduce((sum, value, i) => sum + value * b[i], 0) / divisor;
}
export function combinationPoints(chars: readonly Kanji[], multiplier: number): number {
  let sum = 0;
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      sum += similarity(GROUPS[chars[i].group].vector, GROUPS[chars[j].group].vector);
    }
  }
  const config = RULES.combination;
  return Math.max(config.min, Math.min(config.max, Math.round(sum * config.scale * multiplier)));
}
export function scoreTeam(characters: FourCharacters, random: Random = Math.random): Score {
  if (characters.length !== RULES.teamSize) throw new Error('得点計算には4文字が必要です。');
  const hasFiller = characters.some(char => char.kind === 'filler');
  if (hasFiller) return {
    characters: [...characters] as unknown as FourCharacters,
    hasFiller, total: RULES.fillerTotal,
    steps: [{ kind: 'filler', label: '数字「1」が含まれるため、合計1点', points: RULES.fillerTotal }],
  };
  const chars = characters as readonly Kanji[];
  const steps: ScoreStep[] = chars.map((char, index) => {
    const [min, max] = GROUPS[char.group].points;
    return { kind: 'character', index, label: `${char.char}のポイント`, points: integer(min, max, random) };
  });
  const [min, max] = RULES.combination.multiplier;
  const multiplier = min + roll(random) * (max - min);
  steps.push({ kind: 'combination', label: '組み合わせポイント', points: combinationPoints(chars, multiplier) });
  const weight = RARITIES.reduce((sum, rarity) => sum + rarity.weight, 0);
  if (weight <= 0 || RARITIES.some(rarity => rarity.weight < 0)) throw new Error('レアリティの重みが不正です。');
  chars.forEach((char, index) => {
    let value = roll(random) * weight;
    const rarity = RARITIES.find(entry => { value -= entry.weight; return value < 0; }) ?? RARITIES[RARITIES.length - 1];
    steps.push({ kind: 'rarity', index, rarity: rarity.id, label: `${char.char}のレアリティ ${rarity.id}`, points: rarity.points });
  });
  return { characters: [...characters] as unknown as FourCharacters, steps, total: steps.reduce((sum, step) => sum + step.points, 0), hasFiller };
}
