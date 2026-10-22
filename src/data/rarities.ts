import type { Rarity } from '../game/types.ts';

// 重みの合計に対する割合。点数は固定加算の初期設定。
export const RARITIES: readonly { id: Rarity; weight: number; points: number; color: string }[] = [
  { id: 'N', weight: 50, points: 0, color: '#ffffff' },
  { id: 'C', weight: 28, points: 10, color: '#55a65a' },
  { id: 'R', weight: 15, points: 30, color: '#b87333' },
  { id: 'SR', weight: 6, points: 80, color: '#ffd700' },
  { id: 'UR', weight: 1, points: 200, color: 'linear-gradient(90deg, red, orange, yellow, green, blue, violet)' },
];
