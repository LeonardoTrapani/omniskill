import type { AgentResult, CheckResult, EvalMetrics, JudgeResult } from "../types.js";

// Cost per 1M tokens (approximate for regolo gpt-oss-120b)
const INPUT_COST_PER_M = 0.5;
const OUTPUT_COST_PER_M = 1.5;

export function computeMetrics(
  agentResult: AgentResult,
  checkResults: CheckResult[],
  judgeResult: JudgeResult | null,
): EvalMetrics {
  const passed = checkResults.filter((c) => c.passed).length;
  const checkPassRate = checkResults.length > 0 ? passed / checkResults.length : 0;

  const completionRate = agentResult.completed ? checkPassRate : 0;

  const qualityScores = judgeResult?.dimensions ?? {};
  const qualityComposite = judgeResult?.composite ?? 0;

  const inputCost = (agentResult.inputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (agentResult.outputTokens / 1_000_000) * OUTPUT_COST_PER_M;

  return {
    completionRate,
    checkPassRate,
    qualityScores,
    qualityComposite,
    efficiency: {
      totalTokens: agentResult.inputTokens + agentResult.outputTokens,
      messageCount: agentResult.messageCount,
      wallTimeMs: agentResult.wallTimeMs,
      toolCallCount: agentResult.toolCallCount,
      failedToolCallCount: agentResult.failedToolCallCount,
    },
    estimatedCostUsd: inputCost + outputCost,
  };
}
