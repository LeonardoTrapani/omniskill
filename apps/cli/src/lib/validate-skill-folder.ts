import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import { parseMentions } from "@better-skills/markdown/persisted-mentions";

import { collectNewResourceMentionPaths, normalizeResourcePath } from "./new-resource-mentions";

const RESOURCE_DIRS = ["references", "scripts", "assets"] as const;

export type SkillFolderValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  resourceCount: number;
  mentionCount: number;
};

function splitFrontmatter(skillMarkdown: string): { frontmatter: string | null; body: string } {
  if (!skillMarkdown.startsWith("---\n") && !skillMarkdown.startsWith("---\r\n")) {
    return { frontmatter: null, body: skillMarkdown };
  }

  const lines = skillMarkdown.split(/\r?\n/);
  let endIndex = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: null, body: skillMarkdown };
  }

  return {
    frontmatter: lines.slice(1, endIndex).join("\n"),
    body: lines.slice(endIndex + 1).join("\n"),
  };
}

function hasFrontmatterField(frontmatter: string, field: "name" | "description"): boolean {
  const pattern = new RegExp(`^${field}:\\s*(.*)$`, "m");
  return pattern.test(frontmatter);
}

async function collectLocalResources(folder: string): Promise<Set<string>> {
  const resources = new Set<string>();

  for (const dirName of RESOURCE_DIRS) {
    const root = join(folder, dirName);
    const rootStat = await stat(root).catch(() => null);

    if (!rootStat?.isDirectory()) {
      continue;
    }

    const entries = await readdir(root, { recursive: true });

    for (const entry of entries) {
      const fullPath = join(root, entry);
      const fileStat = await stat(fullPath).catch(() => null);

      if (!fileStat?.isFile()) {
        continue;
      }

      const relativePath = normalizeResourcePath(relative(folder, fullPath));
      resources.add(relativePath);
    }
  }

  return resources;
}

type MentionCounts = {
  newPaths: string[];
  uuidResourceCount: number;
  total: number;
};

// We count two kinds of resource mentions to decide if every local file
// is accounted for:
//
//   1. [[resource:new:<path>]] — always internal, maps directly to a file
//   2. [[resource:<uuid>]]    — could be internal or external; we only
//      count it when the uuid belongs to this skill's own resources.
//      Clone writes a .resource-ids.json map so we can tell the difference.
//
// The total of (1) + (2) should equal the number of local resource files.
// If it doesn't, something is missing a mention.
async function collectAllResourceMentions(
  folder: string,
  skillMdBody: string,
  localResources: Set<string>,
): Promise<MentionCounts> {
  const newPathSet = new Set<string>();
  const uuidSet = new Set<string>();

  // load uuid→path map written by clone; absent for newly authored skills
  const resourceIds: Record<string, string> = await readFile(
    join(folder, ".resource-ids.json"),
    "utf8",
  )
    .then((raw) => JSON.parse(raw))
    .catch(() => ({}));
  const internalIds = new Set(Object.keys(resourceIds).map((id) => id.toLowerCase()));

  const scanMarkdown = (text: string) => {
    for (const p of collectNewResourceMentionPaths(text)) newPathSet.add(p);
    for (const m of parseMentions(text)) {
      // skip external resource mentions and skill mentions
      if (m.type !== "resource") continue;
      if (internalIds.size > 0 && !internalIds.has(m.targetId)) continue;
      uuidSet.add(m.targetId);
    }
  };

  scanMarkdown(skillMdBody);

  for (const resourcePath of localResources) {
    if (!resourcePath.endsWith(".md")) continue;
    const content = await readFile(join(folder, resourcePath), "utf8").catch(() => null);
    if (!content) continue;
    scanMarkdown(content);
  }

  const newPaths = [...newPathSet];
  return {
    newPaths,
    uuidResourceCount: uuidSet.size,
    total: newPathSet.size + uuidSet.size,
  };
}

export async function validateSkillFolder(folder: string): Promise<SkillFolderValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const folderStat = await stat(folder).catch(() => null);
  if (!folderStat?.isDirectory()) {
    return {
      ok: false,
      errors: [`not a directory: ${folder}`],
      warnings,
      resourceCount: 0,
      mentionCount: 0,
    };
  }

  const skillMdPath = join(folder, "SKILL.md");
  const content = await readFile(skillMdPath, "utf8").catch(() => null);

  if (!content) {
    return {
      ok: false,
      errors: ["SKILL.md not found"],
      warnings,
      resourceCount: 0,
      mentionCount: 0,
    };
  }

  const { frontmatter, body } = splitFrontmatter(content);

  if (frontmatter === null) {
    errors.push("SKILL.md must start with YAML frontmatter delimited by ---");
  } else {
    if (!hasFrontmatterField(frontmatter, "name")) {
      errors.push("frontmatter missing required field: name");
    }

    if (!hasFrontmatterField(frontmatter, "description")) {
      errors.push("frontmatter missing required field: description");
    }
  }

  const localResources = await collectLocalResources(folder);
  const mentions = await collectAllResourceMentions(folder, body, localResources);

  const missing = mentions.newPaths.filter((path) => !localResources.has(path));
  if (missing.length > 0) {
    errors.push("missing local resources for :new: mention tokens:");
    errors.push(...missing.map((path) => `  - ${path}`));
  }

  if (localResources.size > 0 && mentions.total < localResources.size) {
    const uncovered = localResources.size - mentions.total;

    if (mentions.uuidResourceCount === 0) {
      // all mentions are :new: — we know exactly which files are uncovered
      const newPathSet = new Set(mentions.newPaths);
      const unreferenced = [...localResources].filter((path) => !newPathSet.has(path));
      warnings.push(
        [
          `${uncovered} resource file(s) not referenced by any mention:`,
          ...unreferenced.map((path) => `  - ${path}`),
        ].join("\n"),
      );
    } else {
      warnings.push(`${uncovered} resource file(s) not referenced by any mention`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    resourceCount: localResources.size,
    mentionCount: mentions.total,
  };
}

export function formatValidationFailure(result: SkillFolderValidationResult): string {
  const lines = ["validation failed", ...result.errors.map((error) => `- ${error}`)];

  if (result.warnings.length > 0) {
    lines.push(...result.warnings.map((warning) => `- warning: ${warning}`));
  }

  return lines.join("\n");
}

export async function assertValidSkillFolder(folder: string): Promise<SkillFolderValidationResult> {
  const result = await validateSkillFolder(folder);

  if (!result.ok || result.warnings.length > 0) {
    throw new Error(formatValidationFailure(result));
  }

  return result;
}
