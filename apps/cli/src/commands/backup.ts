import { rm } from "node:fs/promises";

import * as p from "@clack/prompts";
import pc from "picocolors";

import { syncPrivateSkills } from "./sync";
import { resolveInstallAgents, supportedAgents, type SupportedAgent } from "../lib/agents";
import {
  applyBackupPlan,
  createBackupPlan,
  readBackupPlan,
  writeBackupPlan,
} from "../lib/backup-flow";
import { readErrorMessage } from "../lib/errors";

type BackupPlanArgs = {
  sourceDir?: string;
  outPath?: string;
  agents: SupportedAgent[];
};

type BackupApplyArgs = {
  planPath?: string;
  keepSnapshot: boolean;
};

function printUsage() {
  p.log.info("usage:");
  p.log.info("  better-skills backup plan [--source <dir>] [--out <file>] [--agent <agent>]...");
  p.log.info("  better-skills backup apply --plan <file> [--keep-snapshot]");
  p.log.info(`  agents: ${supportedAgents.join(", ")}`);
}

function parsePlanArgs(args: string[]): BackupPlanArgs {
  const result: BackupPlanArgs = {
    agents: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === "--source" && args[i + 1]) {
      result.sourceDir = args[++i];
      continue;
    }

    if (arg === "--out" && args[i + 1]) {
      result.outPath = args[++i];
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
  }

  result.agents = [...new Set(result.agents)];

  return result;
}

function parseApplyArgs(args: string[]): BackupApplyArgs {
  const result: BackupApplyArgs = {
    keepSnapshot: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === "--plan" && args[i + 1]) {
      result.planPath = args[++i];
      continue;
    }

    if (arg === "--keep-snapshot") {
      result.keepSnapshot = true;
      continue;
    }
  }

  return result;
}

function printPlanSummary(planPath: string, plan: Awaited<ReturnType<typeof createBackupPlan>>) {
  p.log.success(pc.green("backup plan created"));
  p.log.info(pc.dim(`plan: ${planPath}`));
  p.log.info(
    pc.dim(
      `summary: unique=${plan.summary.uniqueSkills}, create=${plan.summary.createCount}, update=${plan.summary.updateCount}, skip=${plan.summary.skipCount}, deduped=${plan.summary.dedupedOccurrences}`,
    ),
  );

  if (plan.skippedFolders.length > 0) {
    p.log.info(pc.dim(`skipped folders: ${plan.skippedFolders.length}`));
  }

  for (const item of plan.items) {
    const target = item.targetSkillSlug ? ` -> ${item.targetSkillSlug}` : "";
    p.log.info(
      `${item.action.toUpperCase().padEnd(6)} ${item.slug}${target} (${item.confidence}) - ${item.reason}`,
    );
  }

  p.log.info(pc.dim(`next: better-skills backup apply --plan ${planPath}`));
}

async function backupPlanSubcommand() {
  const args = parsePlanArgs(process.argv.slice(4));
  const spinner = p.spinner();
  spinner.start("building backup plan");

  try {
    const plan = await createBackupPlan({
      sourceDir: args.sourceDir,
      agents: args.agents.length > 0 ? args.agents : undefined,
    });
    const planPath = await writeBackupPlan(plan, args.outPath);

    spinner.stop(pc.green("plan ready"));
    printPlanSummary(planPath, plan);
  } catch (error) {
    spinner.stop(pc.red("backup plan failed"));
    p.log.error(readErrorMessage(error));
    process.exit(1);
  }
}

async function backupApplySubcommand() {
  const args = parseApplyArgs(process.argv.slice(4));
  if (!args.planPath) {
    p.log.error("usage: better-skills backup apply --plan <file> [--keep-snapshot]");
    process.exit(1);
  }

  const selectedAgents = await resolveInstallAgents();
  if (selectedAgents.length === 0) {
    p.log.error("no agents selected (run better-skills config)");
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start("loading backup plan");

  try {
    const plan = await readBackupPlan(args.planPath);
    spinner.stop(pc.dim("plan loaded"));

    spinner.start("applying backup plan");
    const applyResult = await applyBackupPlan(plan, { planPath: args.planPath });

    spinner.stop(
      pc.green(
        `backup apply complete (created ${applyResult.createdCount}, updated ${applyResult.updatedCount}, failed ${applyResult.failedCount})`,
      ),
    );

    p.log.info(pc.dim(`snapshot: ${applyResult.snapshotDir}`));

    if (applyResult.removedLocalFolders.length > 0) {
      p.log.info(pc.dim(`removed local folders: ${applyResult.removedLocalFolders.length}`));
    }

    for (const warning of applyResult.cleanupWarnings) {
      p.log.warn(pc.dim(`cleanup warning: ${warning}`));
    }

    const hasSuccessfulMutations = applyResult.createdCount + applyResult.updatedCount > 0;

    if (!hasSuccessfulMutations) {
      p.log.info(pc.dim("no successful create/update operations, skipping sync"));
      if (!args.keepSnapshot) {
        await rm(applyResult.snapshotDir, { recursive: true, force: true });
        p.log.info(pc.dim("removed snapshot folder"));
      }
      return;
    }

    const syncResult = await syncPrivateSkills(selectedAgents, {
      promptUnsyncedBackup: false,
    });

    const syncFailed = !syncResult.ok || !syncResult.authenticated;

    if (syncFailed) {
      p.log.warn(pc.dim("sync had failures; snapshot kept for recovery"));
      p.log.info(pc.dim(`rerun: better-skills sync`));
      return;
    }

    if (args.keepSnapshot) {
      p.log.info(pc.dim("sync succeeded; keeping snapshot because --keep-snapshot was set"));
      return;
    }

    await rm(applyResult.snapshotDir, { recursive: true, force: true });
    p.log.info(pc.dim("sync succeeded; removed snapshot folder"));
  } catch (error) {
    spinner.stop(pc.red("backup apply failed"));
    p.log.error(readErrorMessage(error));
    process.exit(1);
  }
}

export async function backupCommand() {
  const subcommand = process.argv[3];

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printUsage();
    return;
  }

  if (subcommand === "plan") {
    await backupPlanSubcommand();
    return;
  }

  if (subcommand === "apply") {
    await backupApplySubcommand();
    return;
  }

  p.log.error(`unknown backup subcommand: ${subcommand}`);
  printUsage();
  process.exit(1);
}
