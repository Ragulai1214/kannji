// アクション版の初期設定。ゲームの数値・時間はここで調整する。
export const ACTION = {
  radius: 8,
  bodyRadius: .75,
  moveSpeed: 5,
  attack: { windup: .24, active: .2, recovery: .34, cooldown: .85, speed: 9, reach: 2.25, facingDot: .35 },
  dodge: { duration: .48, recovery: .12, cooldown: 1.35, speed: 10, invulnerableFrom: .04, invulnerableTo: .35 },
  hitStun: .16,
  timeLimit: 90,
  // 元の配分を使いつつ能力差を圧縮。乱数倍率は圧縮後、最後に掛ける。
  compression: { hp: { base: 400, scale: 1.4 }, atk: { base: 50, scale: .6 }, def: { base: 15, scale: .3 } },
} as const;
