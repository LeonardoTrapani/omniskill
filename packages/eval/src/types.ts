import { z } from "zod";

// ─── Verifier Schemas ────────────────────────────────────────────────────────

export const verifierCheckKindSchema = z.enum([
  "file-exists",
  "file-contains",
  "command-exit",
  "test-pass",
]);

export const verifierCheckSchema = z.object({
  name: z.string(),
  kind: verifierCheckKindSchema,
  config: z.record(z.string(), z.unknown()),
});

export const deterministicVerifierSchema = z.object({
  type: z.literal("deterministic"),
  checks: z.array(verifierCheckSchema),
});

export const llmJudgeVerifierSchema = z.object({
  type: z.literal("llm-judge"),
  rubric: z.string(),
  dimensions: z.array(z.string()),
});

export const compositeVerifierSchema = z.object({
  type: z.literal("composite"),
  deterministic: deterministicVerifierSchema,
  llmJudge: llmJudgeVerifierSchema,
  deterministicWeight: z.number().min(0).max(1).default(0.6),
});

export const evalVerifierSchema = z.discriminatedUnion("type", [
  deterministicVerifierSchema,
  llmJudgeVerifierSchema,
  compositeVerifierSchema,
]);

// ─── Task Schema ─────────────────────────────────────────────────────────────

export const evalTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetSkillSlugs: z.array(z.string()),
  domain: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  prompt: z.string(),
  scaffold: z.record(z.string(), z.string()).optional(),
  verifier: evalVerifierSchema,
  tags: z.array(z.string()).optional(),
  timeoutMs: z.number().default(120_000),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type VerifierCheck = z.infer<typeof verifierCheckSchema>;
export type DeterministicVerifier = z.infer<typeof deterministicVerifierSchema>;
export type LLMJudgeVerifier = z.infer<typeof llmJudgeVerifierSchema>;
export type CompositeVerifier = z.infer<typeof compositeVerifierSchema>;
export type EvalVerifier = z.infer<typeof evalVerifierSchema>;
export type EvalTask = z.infer<typeof evalTaskSchema>;

// ─── Execution Result ────────────────────────────────────────────────────────

export interface AgentResult {
  completed: boolean;
  wallTimeMs: number;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  toolCallCount: number;
  failedToolCallCount: number;
  filesWritten: Record<string, string>;
  conversationLog: string;
  exitCode: number;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface JudgeResult {
  dimensions: Record<string, number>;
  composite: number;
  reasoning: string;
}

export interface EvalMetrics {
  completionRate: number;
  checkPassRate: number;
  qualityScores: Record<string, number>;
  qualityComposite: number;
  efficiency: {
    totalTokens: number;
    messageCount: number;
    wallTimeMs: number;
    toolCallCount: number;
    failedToolCallCount: number;
  };
  estimatedCostUsd: number;
}

export interface EvalComparison {
  skillSlug: string;
  taskId: string;
  control: EvalMetrics;
  treatment: EvalMetrics;
  delta: {
    completionRateDelta: number;
    checkPassRateDelta: number;
    qualityCompositeDelta: number;
    tokenReduction: number;
    messageReduction: number;
    wallTimeReductionMs: number;
    costReductionUsd: number;
  };
  impactScore: number;
}

// ─── Report Types ────────────────────────────────────────────────────────────

export interface TaskReport {
  taskId: string;
  taskName: string;
  domain: string;
  control: EvalMetrics;
  treatment: EvalMetrics;
  impactScore: number;
}

export interface SkillReport {
  skillSlug: string;
  tasks: TaskReport[];
  aggregate: {
    completionRateDelta: number;
    qualityCompositeDelta: number;
    tokenReductionPct: number;
    impactScore: number;
  };
}

export interface EvalReport {
  runId: string;
  timestamp: string;
  skills: SkillReport[];
  summary: {
    skillsEvaluated: number;
    tasksExecuted: number;
    averageImpactScore: number;
    bestSkill: { slug: string; impactScore: number } | null;
    totalCostUsd: number;
    totalTimeMs: number;
  };
}
