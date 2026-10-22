import type { Score, ScoreStep } from './types.ts';

// 補填は初期表示から1点。通常の加点には参加しない。
export function scoreAt(score: Score, completedSteps: number): number {
  return score.hasFiller ? score.total : score.steps.slice(0, completedSteps).reduce((sum, step) => sum + step.points, 0);
}
export function stepAt(score: Score, index: number): ScoreStep | undefined {
  return score.hasFiller ? undefined : score.steps[index];
}
