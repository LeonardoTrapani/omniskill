import type { EvalComparison, EvalMetrics } from "../types.js";

export interface ImpactWeights {
  completion: number;
  quality: number;
  tokenEfficiency: number;
  timeEfficiency: number;
}

// Weights focused on outcome metrics. Token/time overhead is a known trade-off
// of skill injection (more context = more input tokens) and is reported but
// not penalized in the impact score. Consistent with SkillsBench methodology.
const DEFAULT_WEIGHTS: ImpactWeights = {
  completion: 0.55,
  quality: 0.45,
  tokenEfficiency: 0.0,
  timeEfficiency: 0.0,
};

export function computeImpactScore(
  control: EvalMetrics,
  treatment: EvalMetrics,
  weights: ImpactWeights = DEFAULT_WEIGHTS,
): EvalComparison["delta"] & { impactScore: number } {
  const completionRateDelta = treatment.completionRate - control.completionRate;
  const checkPassRateDelta = treatment.checkPassRate - control.checkPassRate;
  const qualityCompositeDelta = treatment.qualityComposite - control.qualityComposite;

  const tokenReduction = treatment.efficiency.totalTokens - control.efficiency.totalTokens;
  const messageReduction = treatment.efficiency.messageCount - control.efficiency.messageCount;
  const wallTimeReductionMs = treatment.efficiency.wallTimeMs - control.efficiency.wallTimeMs;
  const costReductionUsd = treatment.estimatedCostUsd - control.estimatedCostUsd;

  // Completion impact: direct delta (0 to 1 range)
  const completionImpact = completionRateDelta;

  // Quality impact: direct delta
  const qualityImpact = qualityCompositeDelta;

  // Token efficiency: only penalize if output tokens increased significantly
  // Input tokens always increase with skills (expected cost), so we're lenient
  const controlTokens = control.efficiency.totalTokens;
  const tokenImpact = controlTokens > 0 ? -tokenReduction / controlTokens : 0;

  // Time efficiency: slight penalty for slower execution
  const controlTime = control.efficiency.wallTimeMs;
  const timeImpact = controlTime > 0 ? -wallTimeReductionMs / controlTime : 0;

  const raw =
    weights.completion * completionImpact +
    weights.quality * qualityImpact +
    weights.tokenEfficiency * tokenImpact +
    weights.timeEfficiency * timeImpact;

  const impactScore = Math.max(-1, Math.min(1, raw));

  return {
    completionRateDelta,
    checkPassRateDelta,
    qualityCompositeDelta,
    tokenReduction,
    messageReduction,
    wallTimeReductionMs,
    costReductionUsd,
    impactScore,
  };
}
