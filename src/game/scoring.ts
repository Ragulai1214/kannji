import { GROUPS } from '../data/groups.ts';
import { RARITIES } from '../data/rarities.ts';
import { RULES } from '../data/rules.ts';
import { integer, roll } from './random.ts';
import { rollRarity } from './rarity.ts';
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
  const resolved = [...chars];
  const steps: ScoreStep[] = chars.map((char, index) => {
    const [min, max] = GROUPS[char.group].points;
    return { kind: 'character', index, label: `${char.char}のポイント`, points: integer(min, max, random) };
  });
  const [min, max] = RULES.combination.multiplier;
  const multiplier = min + roll(random) * (max - min);
  steps.push({ kind: 'combination', label: '組み合わせポイント', points: combinationPoints(chars, multiplier) });
  chars.forEach((char, index) => {
    const id = char.rarity ?? rollRarity(random);
    resolved[index] = { ...char, rarity: id };
    const rarity = RARITIES.find(entry => entry.id === id)!;
    steps.push({ kind: 'rarity', index, rarity: rarity.id, label: `${char.char}のレアリティ ${rarity.id}`, points: rarity.points });
  });
  const subtotal = steps.reduce((sum, step) => sum + step.points, 0);
  const total = Math.max(RULES.total.min, Math.min(RULES.total.max, subtotal));
  if (total !== subtotal) steps.push({ kind: 'limit', label: '得点範囲の調整', points: total - subtotal });
  return { characters: resolved as unknown as FourCharacters, steps, total, hasFiller };
}
