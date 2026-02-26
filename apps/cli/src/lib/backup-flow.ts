import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import { transformOutsideMarkdownCode } from "@better-skills/markdown/transform-outside-markdown-code";

import type { SupportedAgent } from "./agents";
import { getAgentDisplayName, getAgentSkillDir } from "./agents";
import { readErrorMessage } from "./errors";
import { normalizeResourcePath } from "./new-resource-mentions";

const INSTALL_METADATA_FILE = ".better-skills-install.json";
const MARKDOWN_LINK_RE = /(?<!!)\[[^\]\n]+\]\(([^)\n]+)\)/g;
const URI_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const LOCAL_RESOURCE_PREFIXES = ["references/", "scripts/", "assets/"] as const;

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
  inlineLinksRewritten: number;
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
  inlineLinksRewritten: number;
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

function extractMarkdownLinkTarget(rawDestination: string): string | null {
  const trimmed = rawDestination.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("<")) {
    const closingBracketIndex = trimmed.indexOf(">");
    if (closingBracketIndex <= 1) {
      return null;
    }

    return trimmed.slice(1, closingBracketIndex);
  }

  const firstWhitespace = trimmed.search(/\s/);
  if (firstWhitespace === -1) {
    return trimmed;
  }

  return trimmed.slice(0, firstWhitespace);
}

function isLocalResourceLinkTarget(target: string): boolean {
  if (!target || target.startsWith("#") || target.startsWith("//") || URI_SCHEME_RE.test(target)) {
    return false;
  }

  const normalizedTarget = normalizeResourcePath(target);
  if (!normalizedTarget) {
    return false;
  }

  const pathSegments = normalizedTarget.split("/");
  if (pathSegments.includes("..")) {
    return false;
  }

  return LOCAL_RESOURCE_PREFIXES.some((prefix) => normalizedTarget.startsWith(prefix));
}

export function rewriteInlineLinksToDraftMentions(markdown: string): {
  markdown: string;
  replacementCount: number;
} {
  let replacementCount = 0;

  const rewrittenMarkdown = transformOutsideMarkdownCode(markdown, (segment) => {
    return segment.replace(MARKDOWN_LINK_RE, (match, rawDestination: string) => {
      const target = extractMarkdownLinkTarget(rawDestination);

      if (!target || !isLocalResourceLinkTarget(target)) {
        return match;
      }

      replacementCount += 1;
      return `[[resource:new:${normalizeResourcePath(target)}]]`;
    });
  });

  return {
    markdown: rewrittenMarkdown,
    replacementCount,
  };
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

  const folders: string[] = [];

  if (root.includeSelf) {
    const selfSkill = await stat(join(root.path, "SKILL.md")).catch(() => null);
    if (selfSkill?.isFile()) {
      folders.push(root.path);
    }
  }

  const entries = await readdir(root.path, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) {
      continue;
    }

    const skillDir = join(root.path, entry.name);
    const skillFile = await stat(join(skillDir, "SKILL.md")).catch(() => null);

    if (skillFile?.isFile()) {
      folders.push(skillDir);
    }
  }

  return folders;
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
  let inlineLinksRewritten = 0;

  for (const root of roots) {
    const skillDirs = await listSkillDirs(root);
    discoveredCount += skillDirs.length;

    for (const skillDir of skillDirs) {
      const installMetadata = await readFile(join(skillDir, INSTALL_METADATA_FILE), "utf8").catch(
        () => null,
      );

      if (installMetadata) {
        skippedFolders.push({
          path: skillDir,
          reason: "managed by better-skills sync",
        });
        continue;
      }

      const skillMarkdown = await readFile(join(skillDir, "SKILL.md"), "utf8").catch(() => null);

      if (!skillMarkdown) {
        skippedFolders.push({
          path: skillDir,
          reason: "could not read SKILL.md",
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

        const rewritten = rewriteInlineLinksToDraftMentions(skillMarkdown);
        if (rewritten.replacementCount > 0 && rewritten.markdown !== skillMarkdown) {
          await writeFile(join(workPath, "SKILL.md"), rewritten.markdown, "utf8");
        }

        inlineLinksRewritten += rewritten.replacementCount;

        items.push({
          source: root.label,
          sourcePath: skillDir,
          rawPath,
          workPath,
          inlineLinksRewritten: rewritten.replacementCount,
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
    inlineLinksRewritten,
    roots: roots.map((root) => root.path),
    items,
    skippedFolders,
    failures,
  };
}
