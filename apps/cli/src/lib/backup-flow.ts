import { cp, mkdir, readdir, realpath, stat } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import type { SupportedAgent } from "./agents";
import { getAgentDisplayName, getAgentSkillDir } from "./agents";
import { readErrorMessage } from "./errors";

const INSTALL_METADATA_FILE = ".better-skills-install.json";

type DiscoveryRoot = {
  path: string;
  label: string;
  includeSelf: boolean;
};

export type BackupSkippedFolder = {
  path: string;
  reason: string;
};

export type BackupCopyItem = {
  source: string;
  sourcePath: string;
  rawPath: string;
  workPath: string;
};

export type BackupCopyFailure = {
  sourcePath: string;
  rawPath: string;
  workPath: string;
  message: string;
};

export type BackupCopyResult = {
  startedAt: string;
  finishedAt: string;
  backupDir: string;
  rawDir: string;
  workDir: string;
  discoveredCount: number;
  copiedCount: number;
  skippedCount: number;
  failedCount: number;
  roots: string[];
  items: BackupCopyItem[];
  skippedFolders: BackupSkippedFolder[];
  failures: BackupCopyFailure[];
};

export type BackupCopyOptions = {
  sourceDir?: string;
  outputDir?: string;
  agents?: SupportedAgent[];
};

function formatTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function expandPath(pathValue: string): string {
  if (pathValue === "~") {
    return homedir();
  }

  if (pathValue.startsWith("~/")) {
    return join(homedir(), pathValue.slice(2));
  }

  return resolve(process.cwd(), pathValue);
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function resolveDiscoveryRoots(options: BackupCopyOptions): DiscoveryRoot[] {
  if (options.sourceDir) {
    return [
      {
        path: expandPath(options.sourceDir),
        label: "custom source",
        includeSelf: true,
      },
    ];
  }

  if (options.agents && options.agents.length > 0) {
    return uniqueBy(options.agents, (entry) => entry).map((agent) => ({
      path: getAgentSkillDir(agent),
      label: getAgentDisplayName(agent),
      includeSelf: false,
    }));
  }

  return [
    {
      path: getAgentSkillDir("opencode"),
      label: getAgentDisplayName("opencode"),
      includeSelf: false,
    },
    {
      path: getAgentSkillDir("claude-code"),
      label: getAgentDisplayName("claude-code"),
      includeSelf: false,
    },
    {
      path: getAgentSkillDir("cursor"),
      label: getAgentDisplayName("cursor"),
      includeSelf: false,
    },
    {
      path: join(process.cwd(), ".agents", "skills"),
      label: "workspace .agents/skills",
      includeSelf: false,
    },
  ];
}

async function listSkillDirs(root: DiscoveryRoot): Promise<string[]> {
  const rootStat = await stat(root.path).catch(() => null);

  if (!rootStat?.isDirectory()) {
    return [];
  }

  const visited = new Set<string>();
  const pending = [root.path];
  const folders: string[] = [];

  while (pending.length > 0) {
    const currentDir = pending.pop()!;
    const resolvedDir = await realpath(currentDir).catch(() => currentDir);

    if (visited.has(resolvedDir)) {
      continue;
    }

    visited.add(resolvedDir);

    const skillFile = await stat(join(currentDir, "SKILL.md")).catch(() => null);
    const isRoot = currentDir === root.path;

    if (skillFile?.isFile() && (!isRoot || root.includeSelf)) {
      folders.push(currentDir);
    }

    const entries = await readdir(currentDir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries.toSorted((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) {
        continue;
      }

      const childDir = join(currentDir, entry.name);
      const childStat = await stat(childDir).catch(() => null);

      if (!childStat?.isDirectory()) {
        continue;
      }

      pending.push(childDir);
    }
  }

  return folders.toSorted((a, b) => a.localeCompare(b));
}

function toBackupFolderName(index: number, folderPath: string): string {
  return `${String(index).padStart(3, "0")}-${basename(folderPath)}`;
}

export async function copyLocalSkillsToBackupTmp(
  options: BackupCopyOptions = {},
): Promise<BackupCopyResult> {
  const startedAt = new Date().toISOString();
  const roots = resolveDiscoveryRoots(options);
  const backupDir = options.outputDir
    ? expandPath(options.outputDir)
    : join(tmpdir(), "better-skills-backup", formatTimestamp());
  const rawDir = join(backupDir, "raw");
  const workDir = join(backupDir, "work");

  await mkdir(rawDir, { recursive: true });
  await mkdir(workDir, { recursive: true });

  const items: BackupCopyItem[] = [];
  const skippedFolders: BackupSkippedFolder[] = [];
  const failures: BackupCopyFailure[] = [];

  let discoveredCount = 0;

  for (const root of roots) {
    const skillDirs = await listSkillDirs(root);
    discoveredCount += skillDirs.length;

    for (const skillDir of skillDirs) {
      const hasInstallMetadata = await stat(join(skillDir, INSTALL_METADATA_FILE)).catch(
        () => null,
      );

      if (hasInstallMetadata) {
        skippedFolders.push({
          path: skillDir,
          reason: "managed by better-skills sync",
        });
        continue;
      }

      const index = items.length + failures.length + 1;
      const folderName = toBackupFolderName(index, skillDir);
      const rawPath = join(rawDir, folderName);
      const workPath = join(workDir, folderName);

      try {
        await cp(skillDir, rawPath, { recursive: true, dereference: true });
        await cp(rawPath, workPath, { recursive: true, dereference: true });

        items.push({
          source: root.label,
          sourcePath: skillDir,
          rawPath,
          workPath,
        });
      } catch (error) {
        failures.push({
          sourcePath: skillDir,
          rawPath,
          workPath,
          message: readErrorMessage(error),
        });
      }
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    backupDir,
    rawDir,
    workDir,
    discoveredCount,
    copiedCount: items.length,
    skippedCount: skippedFolders.length,
    failedCount: failures.length,
    roots: roots.map((root) => root.path),
    items,
    skippedFolders,
    failures,
  };
}
