import type { GroupId, Vector } from '../game/types.ts';

// 初期設定。ベクトルは計算時に正規化する。
export const GROUPS: Readonly<Record<GroupId, { name: string; points: readonly [number, number]; vector: Vector }>> = {
  sky: { name: '天象・光', points: [10, 100], vector: [1, 0, 1] },
  earth: { name: '地象・物質', points: [10, 100], vector: [1, 1, 0] },
  plants: { name: '草木', points: [10, 100], vector: [0, 1, 1] },
  life: { name: '生物・身体', points: [10, 100], vector: [1, 1, 1] },
  mind: { name: '心情・知性', points: [10, 100], vector: [-1, 0, 1] },
  action: { name: '行動・武芸', points: [10, 100], vector: [1, -1, 0] },
  quality: { name: '性質・数量', points: [10, 100], vector: [0, 1, -1] },
};
