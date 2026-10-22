export const RULES = {
  teamSize: 4,
  maxDraws: 10,
  fillerTotal: 1,
  total: { min: 100, max: 99999 },
  combination: { multiplier: [0.8, 1.2] as const, scale: 2800, min: 0, max: 19999 },
} as const;
