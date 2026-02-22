import type { EvalReport } from "../types.js";

export function formatJsonReport(report: EvalReport): string {
  return JSON.stringify(report, null, 2);
}

export async function writeJsonReport(report: EvalReport, outputPath: string): Promise<void> {
  await Bun.write(outputPath, formatJsonReport(report));
}
