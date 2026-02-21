import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";

export type ResourceKind = "reference" | "script" | "asset" | "other";

export interface SkillResourceEntry {
  /** Relative path from the skill directory (e.g. "references/guide.md") */
  path: string;
  /** Classified kind based on parent directory / extension */
  kind: ResourceKind;
  /** File content as UTF-8 string */
  content: string;
}

/** Map directory names to resource kinds */
const DIR_KIND_MAP: Record<string, ResourceKind> = {
  references: "reference",
  scripts: "script",
  assets: "asset",
};

/** Binary file extensions to skip (cannot be stored as UTF-8 text) */
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".ttf", ".otf", ".woff", ".woff2", ".eot",
  ".pdf", ".zip", ".gz", ".tar", ".bz2",
  ".mp3", ".mp4", ".wav", ".ogg", ".webm",
  ".exe", ".dll", ".so", ".dylib",
  ".bin", ".dat", ".db", ".sqlite",
]);

/** Check if a file extension indicates a binary file */
function isBinaryFile(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(extname(filePath).toLowerCase());
}

/** Classify a resource based on its parent directory and extension */
function classifyResource(relPath: string): ResourceKind {
  const firstDir = relPath.split("/")[0]!;
  if (firstDir in DIR_KIND_MAP) {
    return DIR_KIND_MAP[firstDir]!;
  }

  const ext = extname(relPath).toLowerCase();
  if ([".ts", ".js", ".mjs", ".cjs"].includes(ext)) return "script";
  if ([".md", ".mdx", ".txt"].includes(ext)) return "reference";
  return "other";
}

/**
 * Recursively scan a skill directory for resource files.
 * Skips SKILL.md (the main skill file) and any nested duplicate skill directories.
 */
async function walkDir(dir: string, baseDir: string): Promise<SkillResourceEntry[]> {
  const entries: SkillResourceEntry[] = [];

  let items: string[];
  try {
    items = await readdir(dir);
  } catch {
    return entries;
  }

  for (const item of items) {
    const fullPath = join(dir, item);
    const relPath = relative(baseDir, fullPath).replace(/\\/g, "/");

    const info = await stat(fullPath);

    if (info.isDirectory()) {
      // Skip nested duplicate skill directories (e.g. better-auth/better-auth/)
      const nestedSkill = join(fullPath, "SKILL.md");
      try {
        await stat(nestedSkill);
        // Has a SKILL.md inside — this is a nested duplicate, skip it
        continue;
      } catch {
        // No SKILL.md — recurse into subdirectory
      }
      const sub = await walkDir(fullPath, baseDir);
      entries.push(...sub);
    } else if (info.isFile() && item !== "SKILL.md" && !isBinaryFile(item)) {
      const content = await readFile(fullPath, "utf-8");
      entries.push({
        path: relPath,
        kind: classifyResource(relPath),
        content,
      });
    }
  }

  return entries;
}

/**
 * Scan a skill directory for all resource files (references, scripts, assets).
 * Returns an array of resource entries ready for DB insertion.
 */
export async function scanResources(skillDir: string): Promise<SkillResourceEntry[]> {
  return walkDir(skillDir, skillDir);
}
