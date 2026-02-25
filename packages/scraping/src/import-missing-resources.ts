#!/usr/bin/env bun
/**
 * Import Missing Resources
 *
 * Finds resources that exist on disk but are missing from the DB,
 * and imports them. Uses batch inserts to avoid Neon request limits.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve, extname, relative } from "node:path";
import { parseArgs } from "node:util";

import { eq, and, isNull } from "drizzle-orm";

import { db } from "@omniscient/db/script";
import { skill, skillResource } from "@omniscient/db/schema/skills";

const { values } = parseArgs({
  options: {
    dir: { type: "string", short: "d" },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

const parsedSkillsDir = resolve(values.dir ?? "./parsed-skills");
const verbose = values.verbose ?? false;

function log(...args: unknown[]) {
  console.log("[import-missing]", ...args);
}
function debug(...args: unknown[]) {
  if (verbose) console.log("[debug]", ...args);
}

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".eot",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".bz2",
  ".mp3",
  ".mp4",
  ".wav",
  ".ogg",
  ".webm",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".db",
  ".sqlite",
]);

type ResourceKind = "reference" | "script" | "asset" | "other";

const DIR_KIND_MAP: Record<string, ResourceKind> = {
  references: "reference",
  scripts: "script",
  assets: "asset",
  templates: "other",
};

function classifyResource(relPath: string): ResourceKind {
  const firstDir = relPath.split("/")[0]!;
  if (firstDir in DIR_KIND_MAP) return DIR_KIND_MAP[firstDir]!;
  const ext = extname(relPath).toLowerCase();
  if ([".ts", ".js", ".mjs", ".cjs", ".sh", ".py"].includes(ext)) return "script";
  if ([".md", ".mdx", ".txt"].includes(ext)) return "reference";
  return "other";
}

async function walkDir(
  dir: string,
  baseDir: string,
): Promise<Array<{ path: string; kind: ResourceKind; content: string }>> {
  const entries: Array<{ path: string; kind: ResourceKind; content: string }> = [];
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
      const nestedSkill = join(fullPath, "SKILL.md");
      try {
        await stat(nestedSkill);
        continue;
      } catch {}
      const sub = await walkDir(fullPath, baseDir);
      entries.push(...sub);
    } else if (
      info.isFile() &&
      item !== "SKILL.md" &&
      !BINARY_EXTENSIONS.has(extname(item).toLowerCase())
    ) {
      const content = await readFile(fullPath, "utf-8");
      entries.push({ path: relPath, kind: classifyResource(relPath), content });
    }
  }
  return entries;
}

async function main() {
  log("Fetching existing skills and resources from DB...");

  const skills = await db
    .select({ id: skill.id, slug: skill.slug })
    .from(skill)
    .where(and(eq(skill.visibility, "public"), isNull(skill.ownerUserId)));

  const slugToId = new Map<string, string>();
  for (const s of skills) slugToId.set(s.slug, s.id);

  const existingResources = await db
    .select({ skillId: skillResource.skillId, path: skillResource.path })
    .from(skillResource);

  const existingSet = new Set<string>();
  for (const r of existingResources) existingSet.add(`${r.skillId}:${r.path}`);

  log(`${skills.length} skills, ${existingResources.length} existing resources`);

  // Scan disk for missing resources
  let totalMissing = 0;
  let totalImported = 0;

  for (const [slug, skillId] of slugToId) {
    const skillDir = join(parsedSkillsDir, slug);
    try {
      await stat(skillDir);
    } catch {
      continue;
    }

    const diskResources = await walkDir(skillDir, skillDir);
    const missing = diskResources.filter((r) => !existingSet.has(`${skillId}:${r.path}`));

    if (missing.length === 0) continue;

    debug(`${slug}: ${missing.length} missing resources (${diskResources.length} on disk)`);
    totalMissing += missing.length;

    // Insert in batches of 10
    for (let i = 0; i < missing.length; i += 10) {
      const batch = missing.slice(i, i + 10);
      for (const res of batch) {
        try {
          await db
            .insert(skillResource)
            .values({
              skillId,
              path: res.path,
              kind: res.kind,
              content: res.content,
            })
            .onConflictDoUpdate({
              target: [skillResource.skillId, skillResource.path],
              set: {
                kind: res.kind,
                content: res.content,
                updatedAt: new Date(),
              },
            });
          totalImported++;
        } catch (err) {
          log(`ERROR inserting ${slug}/${res.path}:`, (err as Error).message?.slice(0, 100));
        }
      }
    }
  }

  log("─".repeat(60));
  log(`Missing resources found: ${totalMissing}`);
  log(`Successfully imported:   ${totalImported}`);
  log("Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
