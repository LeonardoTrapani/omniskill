import { join } from "node:path";
import { computeImpactScore } from "../scoring/impact.js";
import { computeMetrics } from "../scoring/metrics.js";
import { computeABTest } from "../scoring/statistics.js";
import type {
  AgentResult,
  CheckResult,
  EvalComparison,
  EvalMetrics,
  EvalReport,
  EvalTask,
  JudgeResult,
  SkillReport,
  TaskReport,
} from "../types.js";
import { runCompositeVerifier } from "../verifiers/composite.js";
import { runDeterministicChecks } from "../verifiers/deterministic.js";
import { runLLMJudge } from "../verifiers/llm-judge.js";
import { invokeAgent } from "./agent-invoker.js";
import { createWorkspace } from "./workspace.js";

export interface EvalRunConfig {
  tasks: EvalTask[];
  skillContents: Map<string, string>; // slug -> SKILL.md content
  runs: number;
  tasksDir: string;
}

interface ExecutionResult {
  agentResult: AgentResult;
  checkResults: CheckResult[];
  judgeResult: JudgeResult | null;
  metrics: EvalMetrics;
}

async function executeCondition(
  task: EvalTask,
  skillContent: { slug: string; markdown: string } | null,
  _tasksDir: string,
): Promise<ExecutionResult> {
  const workspace = await createWorkspace(task.scaffold, skillContent);

  try {
    // Invoke agent
    const agentResult = await invokeAgent(task.prompt, workspace.dir, task.timeoutMs);

    // Run verifiers
    let checkResults: CheckResult[] = [];
    let judgeResult: JudgeResult | null = null;

    switch (task.verifier.type) {
      case "deterministic": {
        checkResults = await runDeterministicChecks(task.verifier, workspace.dir);
        break;
      }
      case "llm-judge": {
        judgeResult = await runLLMJudge(
          task.verifier,
          task.prompt,
          agentResult.conversationLog,
          agentResult.filesWritten,
        );
        break;
      }
      case "composite": {
        const result = await runCompositeVerifier(
          task.verifier,
          workspace.dir,
          task.prompt,
          agentResult.conversationLog,
          agentResult.filesWritten,
        );
        checkResults = result.checkResults;
        judgeResult = result.judgeResult;
        break;
      }
    }

    const metrics = computeMetrics(agentResult, checkResults, judgeResult);

    return { agentResult, checkResults, judgeResult, metrics };
  } finally {
    await workspace.cleanup();
  }
}

function averageMetrics(results: ExecutionResult[]): EvalMetrics {
  const n = results.length;
  if (n === 0) {
    return {
      completionRate: 0,
      checkPassRate: 0,
      qualityScores: {},
      qualityComposite: 0,
      efficiency: {
        totalTokens: 0,
        messageCount: 0,
        wallTimeMs: 0,
        toolCallCount: 0,
        failedToolCallCount: 0,
      },
      estimatedCostUsd: 0,
    };
  }

  const avg = (accessor: (m: EvalMetrics) => number) =>
    results.reduce((sum, r) => sum + accessor(r.metrics), 0) / n;

  // Merge quality score keys
  const allDims = new Set<string>();
  for (const r of results) {
    for (const k of Object.keys(r.metrics.qualityScores)) allDims.add(k);
  }
  const qualityScores: Record<string, number> = {};
  for (const dim of allDims) {
    qualityScores[dim] = avg((m) => m.qualityScores[dim] ?? 0);
  }

  return {
    completionRate: avg((m) => m.completionRate),
    checkPassRate: avg((m) => m.checkPassRate),
    qualityScores,
    qualityComposite: avg((m) => m.qualityComposite),
    efficiency: {
      totalTokens: avg((m) => m.efficiency.totalTokens),
      messageCount: avg((m) => m.efficiency.messageCount),
      wallTimeMs: avg((m) => m.efficiency.wallTimeMs),
      toolCallCount: avg((m) => m.efficiency.toolCallCount),
      failedToolCallCount: avg((m) => m.efficiency.failedToolCallCount),
    },
    estimatedCostUsd: avg((m) => m.estimatedCostUsd),
  };
}

export async function runEval(config: EvalRunConfig): Promise<EvalReport> {
  const runId = crypto.randomUUID();
  const startTime = Date.now();
  const skillReports: SkillReport[] = [];

  // Group tasks by target skill
  const tasksBySkill = new Map<string, EvalTask[]>();
  for (const task of config.tasks) {
    for (const slug of task.targetSkillSlugs) {
      if (!config.skillContents.has(slug)) continue;
      const existing = tasksBySkill.get(slug) ?? [];
      existing.push(task);
      tasksBySkill.set(slug, existing);
    }
  }

  let totalCostUsd = 0;

  for (const [skillSlug, tasks] of tasksBySkill) {
    const skillMarkdown = config.skillContents.get(skillSlug)!;
    const taskReports: TaskReport[] = [];

    for (const task of tasks) {
      console.log(`  [${skillSlug}] Running: ${task.name}`);

      // Run control and treatment conditions
      const controlResults: ExecutionResult[] = [];
      const treatmentResults: ExecutionResult[] = [];

      for (let run = 0; run < config.runs; run++) {
        if (config.runs > 1) {
          console.log(`    Run ${run + 1}/${config.runs}`);
        }

        // Control: no skill
        console.log("    Control (no skill)...");
        const controlResult = await executeCondition(task, null, config.tasksDir);
        controlResults.push(controlResult);

        // Treatment: with skill
        console.log("    Treatment (with skill)...");
        const treatmentResult = await executeCondition(
          task,
          { slug: skillSlug, markdown: skillMarkdown },
          config.tasksDir,
        );
        treatmentResults.push(treatmentResult);
      }

      const controlMetrics = averageMetrics(controlResults);
      const treatmentMetrics = averageMetrics(treatmentResults);
      const impact = computeImpactScore(controlMetrics, treatmentMetrics);

      totalCostUsd += controlMetrics.estimatedCostUsd + treatmentMetrics.estimatedCostUsd;

      taskReports.push({
        taskId: task.id,
        taskName: task.name,
        domain: task.domain,
        control: controlMetrics,
        treatment: treatmentMetrics,
        impactScore: impact.impactScore,
      });

      const sign = impact.impactScore >= 0 ? "+" : "";
      console.log(`    Impact: ${sign}${(impact.impactScore * 100).toFixed(1)}%`);
    }

    // Aggregate skill report
    const avgCompletionDelta =
      taskReports.reduce(
        (sum, r) => sum + (r.treatment.completionRate - r.control.completionRate),
        0,
      ) / Math.max(taskReports.length, 1);

    const avgQualityDelta =
      taskReports.reduce(
        (sum, r) => sum + (r.treatment.qualityComposite - r.control.qualityComposite),
        0,
      ) / Math.max(taskReports.length, 1);

    const avgTokenControlTotal = taskReports.reduce(
      (sum, r) => sum + r.control.efficiency.totalTokens,
      0,
    );
    const avgTokenTreatmentTotal = taskReports.reduce(
      (sum, r) => sum + r.treatment.efficiency.totalTokens,
      0,
    );
    const tokenReductionPct =
      avgTokenControlTotal > 0
        ? (avgTokenControlTotal - avgTokenTreatmentTotal) / avgTokenControlTotal
        : 0;

    const avgImpact =
      taskReports.reduce((sum, r) => sum + r.impactScore, 0) / Math.max(taskReports.length, 1);

    skillReports.push({
      skillSlug,
      tasks: taskReports,
      aggregate: {
        completionRateDelta: avgCompletionDelta,
        qualityCompositeDelta: avgQualityDelta,
        tokenReductionPct,
        impactScore: avgImpact,
      },
    });
  }

  // Summary
  let bestSkill: { slug: string; impactScore: number } | null = null;
  for (const sr of skillReports) {
    if (!bestSkill || sr.aggregate.impactScore > bestSkill.impactScore) {
      bestSkill = { slug: sr.skillSlug, impactScore: sr.aggregate.impactScore };
    }
  }

  return {
    runId,
    timestamp: new Date().toISOString(),
    skills: skillReports,
    summary: {
      skillsEvaluated: skillReports.length,
      tasksExecuted: config.tasks.length,
      averageImpactScore:
        skillReports.reduce((s, r) => s + r.aggregate.impactScore, 0) /
        Math.max(skillReports.length, 1),
      bestSkill,
      totalCostUsd,
      totalTimeMs: Date.now() - startTime,
    },
  };
}
