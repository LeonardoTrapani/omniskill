type OutputMode = "interactive" | "plain";

function detect(): OutputMode {
  if (process.env.AGENT === "1") return "plain";
  if (process.env.OPENCODE === "1") return "plain";
  if (process.env.CI === "1" || process.env.CI === "true") return "plain";
  if (!process.stdin.isTTY || !process.stdout.isTTY) return "plain";
  return "interactive";
}

const outputMode: OutputMode = detect();

export const isInteractive = outputMode === "interactive";
export const isPlain = outputMode === "plain";
