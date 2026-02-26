import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import { collectNewResourceMentionPaths, normalizeResourcePath } from "./new-resource-mentions";

const RESOURCE_DIRS = ["references", "scripts", "assets"] as const;

type SkillFolderValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  resourceCount: number;
  newMentionPathCount: number;
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

/**
 * Scan all .md resource files for [[resource:new:...]] mentions and return
 * the deduplicated set of mentioned paths (combined with SKILL.md mentions).
 */
async function collectAllMentionPaths(
  folder: string,
  skillMdBody: string,
  localResources: Set<string>,
): Promise<string[]> {
  const seen = new Set<string>();
  const paths: string[] = [];

  const addPaths = (newPaths: string[]) => {
    for (const p of newPaths) {
      if (!seen.has(p)) {
        seen.add(p);
        paths.push(p);
      }
    }
  };

  addPaths(collectNewResourceMentionPaths(skillMdBody));

  for (const resourcePath of localResources) {
    if (!resourcePath.endsWith(".md")) continue;
    const content = await readFile(join(folder, resourcePath), "utf8").catch(() => null);
    if (!content) continue;
    addPaths(collectNewResourceMentionPaths(content));
  }

  return paths;
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
      newMentionPathCount: 0,
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
      newMentionPathCount: 0,
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
  const mentionPaths = await collectAllMentionPaths(folder, body, localResources);
  const mentionPathSet = new Set(mentionPaths);
  const missing = mentionPaths.filter((path) => !localResources.has(path));

  if (missing.length > 0) {
    errors.push("missing local resources for :new: mention tokens:");
    errors.push(...missing.map((path) => `  - ${path}`));
  }

  if (localResources.size === 0) {
    warnings.push("no local resources found under references/, scripts/, or assets/");
  }

  const unreferenced = [...localResources].filter((path) => !mentionPathSet.has(path));

  if (unreferenced.length > 0) {
    warnings.push(
      [
        `${unreferenced.length} resource file(s) not referenced by any [[resource:new:...]] mention:`,
        ...unreferenced.map((path) => `  - ${path}`),
      ].join("\n"),
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    resourceCount: localResources.size,
    newMentionPathCount: mentionPaths.length,
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

  if (!result.ok) {
    throw new Error(formatValidationFailure(result));
  }

  return result;
}
