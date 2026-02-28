import pc from "picocolors";

import { resolveInstallAgents, supportedAgents, type SupportedAgent } from "../lib/agents";
import { copyLocalSkillsToBackupTmp } from "../lib/backup-flow";
import { readErrorMessage } from "../lib/errors";
import * as ui from "../lib/ui";

type BackupArgs = {
  sourceDir?: string;
  outputDir?: string;
  agents: SupportedAgent[];
};

function printUsage() {
  ui.log.info("usage:");
  ui.log.info("  better-skills backup [--source <dir>] [--out <tmp-dir>] [--agent <agent>]...");
  ui.log.info(`  agents: ${supportedAgents.join(", ")}`);
}

function parseArgs(args: string[]): BackupArgs {
  const result: BackupArgs = {
    agents: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === "--source" && args[i + 1]) {
      result.sourceDir = args[++i];
      continue;
    }

    if (arg === "--out" && args[i + 1]) {
      result.outputDir = args[++i];
      continue;
    }

    if (arg === "--agent" && args[i + 1]) {
      const value = args[++i] as SupportedAgent;
      if (!supportedAgents.includes(value)) {
        throw new Error(`unsupported agent: ${value}`);
      }

      result.agents.push(value);
      continue;
    }

    if (arg === "--help" || arg === "-h" || arg === "help") {
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`unknown option: ${arg}`);
    }

    throw new Error(`backup has no subcommands: ${arg}`);
  }

  result.agents = [...new Set(result.agents)];
  return result;
}

export async function backupCommand() {
  const argv = process.argv.slice(3);

  if (argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    printUsage();
    return;
  }

  let args: BackupArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    ui.log.error(readErrorMessage(error));
    printUsage();
    process.exit(1);
    return;
  }

  const selectedAgents =
    args.sourceDir || args.agents.length > 0 ? args.agents : await resolveInstallAgents();

  if (!args.sourceDir && selectedAgents.length === 0) {
    ui.log.error("no agents selected (run better-skills config or pass --agent)");
    process.exit(1);
  }

  const spinner = ui.spinner();
  spinner.start("copying local skills to backup tmp folder");

  try {
    const result = await copyLocalSkillsToBackupTmp({
      sourceDir: args.sourceDir,
      outputDir: args.outputDir,
      agents: args.sourceDir ? undefined : selectedAgents,
    });

    spinner.stop(pc.green("backup complete"));
    ui.log.info(pc.dim(`tmp: ${result.backupDir}`));
    ui.log.info(pc.dim(`raw: ${result.rawDir}`));
    ui.log.info(pc.dim(`work: ${result.workDir}`));
    ui.log.info(
      pc.dim(
        `summary: discovered=${result.discoveredCount}, copied=${result.copiedCount}, skipped=${result.skippedCount}, failed=${result.failedCount}`,
      ),
    );

    if (result.failures.length > 0) {
      for (const failure of result.failures) {
        ui.log.warn(pc.dim(`${failure.sourcePath}: ${failure.message}`));
      }
      process.exit(1);
    }

    ui.log.info(pc.dim("next: edit work/ if needed, then run create/update from work/ folders"));
  } catch (error) {
    spinner.stop(pc.red("backup failed"));
    ui.log.error(readErrorMessage(error));
    process.exit(1);
  }
}
