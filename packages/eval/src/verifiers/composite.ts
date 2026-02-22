import type { CheckResult, CompositeVerifier, JudgeResult } from "../types.js";
import { runDeterministicChecks } from "./deterministic.js";
import { runLLMJudge } from "./llm-judge.js";

export interface CompositeResult {
  checkResults: CheckResult[];
  judgeResult: JudgeResult;
  checkPassRate: number;
  compositeScore: number;
}

export async function runCompositeVerifier(
  verifier: CompositeVerifier,
  workDir: string,
  prompt: string,
  agentOutput: string,
  filesWritten: Record<string, string>,
): Promise<CompositeResult> {
  const checkResults = await runDeterministicChecks(verifier.deterministic, workDir);
  const judgeResult = await runLLMJudge(verifier.llmJudge, prompt, agentOutput, filesWritten);

  const passed = checkResults.filter((c) => c.passed).length;
  const checkPassRate = checkResults.length > 0 ? passed / checkResults.length : 0;

  const w = verifier.deterministicWeight;
  const compositeScore = w * checkPassRate + (1 - w) * judgeResult.composite;

  return {
    checkResults,
    judgeResult,
    checkPassRate,
    compositeScore,
  };
}
