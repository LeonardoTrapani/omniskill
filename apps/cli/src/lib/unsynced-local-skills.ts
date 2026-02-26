import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import * as p from "@clack/prompts";
import matter from "gray-matter";
import pc from "picocolors";

import type { SupportedAgent } from "./agents";
import { getAgentSkillDir } from "./agents";
import { createBackupPlan, writeBackupPlan } from "./backup-flow";
import { readCliPreferences, saveCliPreferences } from "./config";
import { readErrorMessage } from "./errors";

const INSTALL_METADATA_FILE = ".better-skills-install.json";

type UnsyncedSkillOccurrence = {
  agent: SupportedAgent;
  folder: string;
  path: string;
};

type UnsyncedSkillGroup = {
  folders: string[];
  name: string;
  occurrences: UnsyncedSkillOccurrence[];
};

type ClipboardCommand = {
  command: string;
  args: string[];
  platform?: NodeJS.Platform;
};

const CLIPBOARD_COMMANDS: ClipboardCommand[] = [
  {
    command: "pbcopy",
    args: [],
    platform: "darwin",
  },
  {
    command: "wl-copy",
    args: [],
    platform: "linux",
  },
  {
    command: "xclip",
    args: ["-selection", "clipboard"],
    platform: "linux",
  },
  {
    command: "xsel",
    args: ["--clipboard", "--input"],
    platform: "linux",
  },
  {
    command: "clip.exe",
    args: [],
    platform: "win32",
  },
  {
    command: "clip",
    args: [],
    platform: "win32",
  },
];

async function readSkillName(skillMarkdown: string, fallback: string): Promise<string> {
  try {
    const { data } = matter(skillMarkdown);
    const parsed = typeof data.name === "string" ? data.name.trim() : "";
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function hashSkillContent(skillMarkdown: string): string {
  return createHash("sha1").update(skillMarkdown).digest("hex");
}

async function findUnsyncedLocalSkills(agents: SupportedAgent[]): Promise<UnsyncedSkillGroup[]> {
  const uniqueAgents = [...new Set(agents)];
  const grouped = new Map<string, UnsyncedSkillGroup>();

  for (const agent of uniqueAgents) {
    const agentDir = getAgentSkillDir(agent);
    const entries = await readdir(agentDir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) {
        continue;
      }

      const skillDir = join(agentDir, entry.name);
      const skillMarkdown = await readFile(join(skillDir, "SKILL.md"), "utf8").catch(() => null);
      if (!skillMarkdown) {
        continue;
      }

      const installMetadata = await readFile(join(skillDir, INSTALL_METADATA_FILE), "utf8").catch(
        () => null,
      );

      if (installMetadata) {
        continue;
      }

      const skillName = await readSkillName(skillMarkdown, entry.name);
      const key = hashSkillContent(skillMarkdown);
      const existing = grouped.get(key);

      if (existing) {
        if (!existing.folders.includes(entry.name)) {
          existing.folders.push(entry.name);
        }

        existing.occurrences.push({ agent, folder: entry.name, path: skillDir });
        continue;
      }

      grouped.set(key, {
        folders: [entry.name],
        name: skillName,
        occurrences: [{ agent, folder: entry.name, path: skillDir }],
      });
    }
  }

  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function runClipboardCommand(
  command: string,
  args: string[],
  input: string,
): Promise<boolean> {
  return await new Promise((resolve) => {
    let settled = false;
    const done = (result: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(result);
    };

    const child = spawn(command, args, {
      stdio: ["pipe", "ignore", "ignore"],
    });

    child.once("error", () => done(false));
    child.once("close", (code) => done(code === 0));

    if (!child.stdin) {
      done(false);
      return;
    }

    child.stdin.once("error", () => done(false));
    child.stdin.end(input);
  });
}

async function copyToClipboard(input: string): Promise<boolean> {
  for (const candidate of CLIPBOARD_COMMANDS) {
    if (candidate.platform && candidate.platform !== process.platform) {
      continue;
    }

    const copied = await runClipboardCommand(candidate.command, candidate.args, input);
    if (copied) {
      return true;
    }
  }

  return false;
}

async function maybePromptUnsyncedLocalSkillsBackupInner(agents: SupportedAgent[]): Promise<void> {
  const preferences = readCliPreferences();
  if (preferences.skipUnsyncedBackupPrompt) {
    return;
  }

  const unsynced = await findUnsyncedLocalSkills(agents);
  if (unsynced.length === 0) {
    return;
  }

  const choice = await p.select({
    message:
      "i found local skills that are not backed up to your better-skills vault yet. are you looking to back those up?",
    options: [
      {
        value: "yes",
        label: "1. yes",
      },
      {
        value: "no",
        label: "2. no",
      },
      {
        value: "never",
        label: "3. no (never ask again)",
      },
    ],
  });

  if (p.isCancel(choice) || choice === "no") {
    return;
  }

  if (choice === "never") {
    await saveCliPreferences({ skipUnsyncedBackupPrompt: true });
    p.log.info(pc.dim("ok, i won't ask again"));
    return;
  }

  const spinner = p.spinner();
  spinner.start("building backup plan");

  try {
    const plan = await createBackupPlan({ agents });
    const planPath = await writeBackupPlan(plan);

    spinner.stop(
      pc.green(
        `backup plan ready (${plan.summary.createCount} create, ${plan.summary.updateCount} update, ${plan.summary.skipCount} skip)`,
      ),
    );
    p.log.info(pc.dim(`saved backup plan to: ${planPath}`));

    const applyCommand = `better-skills backup apply --plan ${planPath}`;
    const copied = await copyToClipboard(applyCommand);

    if (copied) {
      p.log.success("backup apply command copied to clipboard");
    } else {
      p.log.info(pc.dim(`next: ${applyCommand}`));
    }

    if (plan.summary.actionableCount === 0) {
      p.log.info(pc.dim("plan has no actionable create/update items"));
    }
  } catch (error) {
    spinner.stop(pc.red("could not build backup plan"));
    p.log.warn(pc.dim(`backup planning failed: ${readErrorMessage(error)}`));
  }
}

export async function maybePromptUnsyncedLocalSkillsBackup(
  agents: SupportedAgent[],
): Promise<void> {
  try {
    await maybePromptUnsyncedLocalSkillsBackupInner(agents);
  } catch (error) {
    p.log.warn(pc.dim(`could not prepare local backup prompt: ${readErrorMessage(error)}`));
  }
}
