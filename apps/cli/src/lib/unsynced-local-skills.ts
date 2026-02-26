import { spawn } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import matter from "gray-matter";
import pc from "picocolors";

import type { SupportedAgent } from "./agents";
import { getAgentDisplayName, getAgentSkillDir } from "./agents";
import { readCliPreferences, saveCliPreferences } from "./config";
import { readErrorMessage } from "./errors";
import { isPlain } from "./output-mode";
import * as ui from "./ui";

const HOME_DIR = homedir();
const INSTALL_METADATA_FILE = ".better-skills-install.json";
const UNSYNCED_PROMPT_FILE_PREFIX = "better-skills-unsynced-local-skills";

type UnsyncedSkillsByAgent = {
  displayName: string;
  skillsDir: string;
  slugs: string[];
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

function readSkillSlug(skillMarkdown: string, fallback: string): string {
  try {
    const { data } = matter(skillMarkdown);
    const parsed = typeof data.slug === "string" ? data.slug.trim() : "";
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function formatTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function formatPathForDisplay(pathValue: string): string {
  if (pathValue === HOME_DIR) {
    return "~";
  }

  if (pathValue.startsWith(`${HOME_DIR}/`)) {
    return `~/${pathValue.slice(HOME_DIR.length + 1)}`;
  }

  return pathValue;
}

async function findUnsyncedLocalSkills(agents: SupportedAgent[]): Promise<UnsyncedSkillsByAgent[]> {
  const uniqueAgents = [...new Set(agents)];
  const grouped: UnsyncedSkillsByAgent[] = [];

  for (const agent of uniqueAgents) {
    const skillsDir = getAgentSkillDir(agent);
    const entries = await readdir(skillsDir, { withFileTypes: true }).catch(() => []);
    const slugs = new Set<string>();

    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) {
        continue;
      }

      const skillDir = join(skillsDir, entry.name);
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

      slugs.add(readSkillSlug(skillMarkdown, entry.name));
    }

    grouped.push({
      displayName: getAgentDisplayName(agent),
      skillsDir,
      slugs: [...slugs].sort((a, b) => a.localeCompare(b)),
    });
  }

  return grouped;
}

function countUnsyncedSkills(groups: UnsyncedSkillsByAgent[]): number {
  return groups.reduce((total, group) => total + group.slugs.length, 0);
}

function renderUnsyncedAgentSection(group: UnsyncedSkillsByAgent): string {
  const lines = group.slugs.length === 0 ? ["- none"] : group.slugs.map((slug) => `- ${slug}`);

  return [`${group.displayName} (${formatPathForDisplay(group.skillsDir)})`, ...lines].join("\n");
}

function renderVaultMergePrompt(groups: UnsyncedSkillsByAgent[]): string {
  return [
    "Use the `better-skills` skill and follow `Flow: Upload Local Skills to Better-Skills Vault`.",
    "",
    "Here are the unsynced skills for each selected agent:",
    "",
    groups.map((group) => renderUnsyncedAgentSection(group)).join("\n\n"),
  ].join("\n");
}

async function writePromptToTempFile(prompt: string): Promise<string> {
  const promptPath = join(tmpdir(), `${UNSYNCED_PROMPT_FILE_PREFIX}-${formatTimestamp()}.md`);
  await writeFile(promptPath, `${prompt}\n`, "utf8");
  return promptPath;
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
  // skip entirely in non-interactive mode
  if (isPlain) return;

  const preferences = readCliPreferences();
  if (preferences.skipUnsyncedBackupPrompt) {
    return;
  }

  const unsynced = await findUnsyncedLocalSkills(agents);
  const unsyncedCount = countUnsyncedSkills(unsynced);

  if (unsyncedCount === 0) {
    return;
  }

  const choice = await ui.select({
    message:
      "i found local skills in the selected folders that are not managed by better-skills yet. are you looking to put them in your vault?",
    options: [
      {
        value: "yes" as const,
        label: "1. yes",
      },
      {
        value: "no" as const,
        label: "2. no",
      },
      {
        value: "never" as const,
        label: "3. no (never ask again)",
      },
    ],
  });

  if (ui.isCancel(choice) || choice === "no") {
    return;
  }

  if (choice === "never") {
    await saveCliPreferences({ skipUnsyncedBackupPrompt: true });
    ui.log.info(pc.dim("ok, i won't ask again"));
    return;
  }

  const spinner = ui.spinner();
  spinner.start("preparing vault merge handoff");

  try {
    const prompt = renderVaultMergePrompt(unsynced);
    const promptPath = await writePromptToTempFile(prompt);

    spinner.stop(pc.green(`vault handoff ready (${unsyncedCount} unsynced skill(s))`));
    ui.log.info(pc.dim(`saved agent prompt to: ${promptPath}`));

    const copied = await copyToClipboard(prompt);

    if (copied) {
      ui.log.success("vault merge prompt copied to clipboard");
      ui.log.info(pc.dim("open your favorite coding agent and use that prompt"));
    } else {
      ui.log.warn(pc.dim("could not copy prompt to clipboard"));
      ui.log.info(pc.dim(`use prompt file: ${promptPath}`));
    }
  } catch (error) {
    spinner.stop(pc.red("could not prepare vault merge handoff"));
    ui.log.warn(pc.dim(`handoff preparation failed: ${readErrorMessage(error)}`));
  }
}

export async function maybePromptUnsyncedLocalSkillsBackup(
  agents: SupportedAgent[],
): Promise<void> {
  try {
    await maybePromptUnsyncedLocalSkillsBackupInner(agents);
  } catch (error) {
    ui.log.warn(pc.dim(`could not prepare local vault merge prompt: ${readErrorMessage(error)}`));
  }
}
