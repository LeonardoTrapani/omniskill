import type { EvalReport } from "../types.js";

export function formatCliReport(report: EvalReport): string {
  const lines: string[] = [];

  lines.push("=".repeat(70));
  lines.push("  OMNISCIENT SKILL EVAL REPORT");
  lines.push(`  Run: ${report.runId.slice(0, 8)}  |  ${report.timestamp}`);
  lines.push("=".repeat(70));
  lines.push("");

  for (const skill of report.skills) {
    lines.push(`SKILL: ${skill.skillSlug}`);
    lines.push("-".repeat(70));

    // Header
    const header =
      padRight("Task", 35) +
      padRight("Completion", 14) +
      padRight("Quality", 10) +
      padRight("Tokens", 12) +
      padRight("Impact", 10);
    lines.push(header);
    lines.push("-".repeat(70));

    for (const task of skill.tasks) {
      const completionCtrl = (task.control.completionRate * 100).toFixed(0);
      const completionTreat = (task.treatment.completionRate * 100).toFixed(0);
      const completionStr = `${completionCtrl}%\u2192${completionTreat}%`;

      const qualityDelta = task.treatment.qualityComposite - task.control.qualityComposite;
      const qualityStr = `${qualityDelta >= 0 ? "+" : ""}${qualityDelta.toFixed(2)}`;

      const tokenCtrl = task.control.efficiency.totalTokens;
      const tokenTreat = task.treatment.efficiency.totalTokens;
      const tokenPct =
        tokenCtrl > 0 ? (((tokenCtrl - tokenTreat) / tokenCtrl) * 100).toFixed(0) : "0";
      const tokenStr = `${tokenPct}%`;

      const impactStr = `${task.impactScore >= 0 ? "+" : ""}${(task.impactScore * 100).toFixed(1)}%`;

      lines.push(
        padRight(task.taskName.slice(0, 33), 35) +
          padRight(completionStr, 14) +
          padRight(qualityStr, 10) +
          padRight(tokenStr, 12) +
          padRight(impactStr, 10),
      );
    }

    lines.push("-".repeat(70));
    const agg = skill.aggregate;
    lines.push(
      padRight("AGGREGATE", 35) +
        padRight(
          `${agg.completionRateDelta >= 0 ? "+" : ""}${(agg.completionRateDelta * 100).toFixed(1)}pp`,
          14,
        ) +
        padRight(
          `${agg.qualityCompositeDelta >= 0 ? "+" : ""}${agg.qualityCompositeDelta.toFixed(2)}`,
          10,
        ) +
        padRight(`${(agg.tokenReductionPct * 100).toFixed(0)}%`, 12) +
        padRight(`${agg.impactScore >= 0 ? "+" : ""}${(agg.impactScore * 100).toFixed(1)}%`, 10),
    );
    lines.push("");
  }

  lines.push("=".repeat(70));
  lines.push("SUMMARY");
  lines.push("=".repeat(70));
  lines.push(`  Skills evaluated:    ${report.summary.skillsEvaluated}`);
  lines.push(`  Tasks executed:      ${report.summary.tasksExecuted}`);
  lines.push(
    `  Average impact:      ${report.summary.averageImpactScore >= 0 ? "+" : ""}${(report.summary.averageImpactScore * 100).toFixed(1)}%`,
  );
  if (report.summary.bestSkill) {
    lines.push(
      `  Best skill:          ${report.summary.bestSkill.slug} (${report.summary.bestSkill.impactScore >= 0 ? "+" : ""}${(report.summary.bestSkill.impactScore * 100).toFixed(1)}%)`,
    );
  }
  lines.push(`  Total cost:          $${report.summary.totalCostUsd.toFixed(4)}`);
  lines.push(`  Total time:          ${formatDuration(report.summary.totalTimeMs)}`);
  lines.push("=".repeat(70));

  return lines.join("\n");
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}
