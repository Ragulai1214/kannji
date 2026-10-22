export const RULES = {
  teamSize: 4,
  maxDraws: 10,
  fillerTotal: 1,
  combination: { multiplier: [0.8, 1.2] as const, scale: 20, min: 0, max: 160 },
} as const;
