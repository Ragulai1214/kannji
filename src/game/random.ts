import type { Random } from './types.ts';

export function roll(random: Random): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('乱数は0以上1未満である必要があります。');
  return value;
}
export function integer(min: number, max: number, random: Random): number {
  return min + Math.floor(roll(random) * (max - min + 1));
}
export function choose<T>(items: readonly T[], random: Random): T {
  if (!items.length) throw new Error('抽選対象がありません。');
  return items[integer(0, items.length - 1, random)];
}
