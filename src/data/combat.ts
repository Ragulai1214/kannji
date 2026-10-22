import type { GroupId, Stats } from '../game/types.ts';

// 合計点の配分と能力別係数。すべて後から調整する初期設定。
export const ALLOCATION: Readonly<Record<GroupId, Stats>> = {
  sky: { hp: .30, atk: .50, def: .20 },
  earth: { hp: .35, atk: .15, def: .50 },
  plants: { hp: .55, atk: .15, def: .30 },
  life: { hp: .45, atk: .35, def: .20 },
  mind: { hp: .25, atk: .25, def: .50 },
  action: { hp: .20, atk: .60, def: .20 },
  quality: { hp: .34, atk: .33, def: .33 },
};
export const COMBAT = {
  coefficient: { hp: 8, atk: 2, def: 1.6 },
  multiplier: [1000, 2000] as const, // 1000分の1単位、1.000〜2.000を含む
} as const;
