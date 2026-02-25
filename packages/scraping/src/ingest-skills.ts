#!/usr/bin/env bun
/**
 * Skill Ingestion Script
 *
 * Reads parsed skill directories and populates the better-skills DB.
 * Two-pass approach:
 *   Pass 1: Import all skills (upsert) with resources
 *   Pass 2: Resolve cross-references (text → [[skill:uuid]])
 *
 * Usage:
 *   bun run packages/db/src/scripts/ingest-skills.ts --dir ../../parsed-skills
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { parseArgs } from "node:util";

import { eq, and, isNull } from "drizzle-orm";

import { db } from "@better-skills/db/script";
import { skill, skillResource } from "@better-skills/db/schema/skills";

import { parseSkillMd } from "./lib/parse-skill-md";
import { scanResources } from "./lib/scan-resources";
import { resolveReferences, type SlugMap } from "./lib/resolve-references";

// ─── CLI args ────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    dir: { type: "string", short: "d" },
    "dry-run": { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

const parsedSkillsDir = resolve(values.dir ?? "./parsed-skills");
const dryRun = values["dry-run"] ?? false;
const verbose = values.verbose ?? false;

function log(...args: unknown[]) {
  console.log("[ingest]", ...args);
}

function debug(...args: unknown[]) {
  if (verbose) console.log("[debug]", ...args);
}

// ─── Pass 1: Import skills ──────────────────────────────────────────────────

interface ImportedSkill {
  slug: string;
  id: string;
  refsResolved: boolean;
}

async function discoverSkillDirs(baseDir: string): Promise<string[]> {
  const entries = await readdir(baseDir);
  const dirs: string[] = [];

  for (const entry of entries) {
    const fullPath = join(baseDir, entry);
    const info = await stat(fullPath);
    if (!info.isDirectory()) continue;

    // Check for SKILL.md directly in this folder
    const skillMdPath = join(fullPath, "SKILL.md");
    try {
      await stat(skillMdPath);
      dirs.push(fullPath);
    } catch {
      // No SKILL.md at top level — check one level deeper for nested structure
      // e.g. parsed-skills/better-auth/better-auth/SKILL.md
      const nestedPath = join(fullPath, entry, "SKILL.md");
      try {
        await stat(nestedPath);
        dirs.push(join(fullPath, entry));
      } catch {
        debug(`Skipping ${entry}: no SKILL.md found`);
      }
    }
  }

  return dirs;
}

async function importSkill(skillDir: string): Promise<ImportedSkill | null> {
  const slug = basename(skillDir);
  const skillMdPath = join(skillDir, "SKILL.md");

  let raw: string;
  try {
    raw = await readFile(skillMdPath, "utf-8");
  } catch {
    log(`WARN: Could not read ${skillMdPath}, skipping`);
    return null;
  }

  const parsed = parseSkillMd(raw);

  if (!parsed.name) {
    log(`WARN: Skill "${slug}" has no name in frontmatter, using slug as name`);
    parsed.name = slug;
  }
  if (!parsed.description) {
    log(`WARN: Skill "${slug}" has no description in frontmatter`);
    parsed.description = "";
  }

  // Build sourceIdentifier from frontmatter if available
  const sourceIdentifier =
    typeof parsed.frontmatter.sourceIdentifier === "string"
      ? parsed.frontmatter.sourceIdentifier
      : null;

  const sourceUrl =
    typeof parsed.frontmatter.sourceUrl === "string" ? parsed.frontmatter.sourceUrl : null;

  if (dryRun) {
    log(`[DRY RUN] Would upsert skill: ${slug} (${parsed.name})`);
    return { slug, id: "dry-run-id", refsResolved: false };
  }

  // Upsert skill: insert or update on conflict with the partial unique index
  // (skill_public_slug_idx: slug WHERE visibility='public' AND owner_user_id IS NULL)
  const upsertResult = await db
    .insert(skill)
    .values({
      slug,
      name: parsed.name,
      description: parsed.description,
      skillMarkdown: parsed.markdown,
      frontmatter: parsed.frontmatter,
      visibility: "public",
      ownerUserId: null,
      sourceUrl,
      sourceIdentifier,
    })
    .onConflictDoUpdate({
      target: skill.slug,
      targetWhere: and(eq(skill.visibility, "public"), isNull(skill.ownerUserId)),
      set: {
        name: parsed.name,
        description: parsed.description,
        skillMarkdown: parsed.markdown,
        frontmatter: parsed.frontmatter,
        sourceUrl,
        sourceIdentifier,
        updatedAt: new Date(),
      },
    })
    .returning({ id: skill.id });

  const skillId = upsertResult[0]?.id;
  if (!skillId) {
    log(`WARN: Upsert for "${slug}" returned no ID, skipping resources`);
    return null;
  }

  // Scan and upsert resources
  const resources = await scanResources(skillDir);
  debug(`  ${slug}: found ${resources.length} resource(s)`);

  for (const res of resources) {
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
  }

  return { slug, id: skillId, refsResolved: false };
}

// ─── Pass 2: Resolve cross-references ───────────────────────────────────────

async function buildSlugMap(): Promise<SlugMap> {
  const rows = await db
    .select({ id: skill.id, slug: skill.slug })
    .from(skill)
    .where(and(eq(skill.visibility, "public"), isNull(skill.ownerUserId)));

  const map: SlugMap = new Map();
  for (const row of rows) {
    map.set(row.slug, row.id);
  }
  return map;
}

async function resolveAllCrossRefs(slugMap: SlugMap): Promise<number> {
  // Fetch all public skills with their markdown
  const rows = await db
    .select({ id: skill.id, slug: skill.slug, markdown: skill.skillMarkdown })
    .from(skill)
    .where(and(eq(skill.visibility, "public"), isNull(skill.ownerUserId)));

  let updatedCount = 0;

  for (const row of rows) {
    const resolved = resolveReferences(row.markdown, slugMap);

    if (resolved !== row.markdown) {
      if (dryRun) {
        log(`[DRY RUN] Would update cross-refs in: ${row.slug}`);
      } else {
        await db
          .update(skill)
          .set({ skillMarkdown: resolved, updatedAt: new Date() })
          .where(eq(skill.id, row.id));
      }
      updatedCount++;
      debug(`  Updated cross-refs in: ${row.slug}`);
    }
  }

  return updatedCount;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  log(`Starting skill ingestion from: ${parsedSkillsDir}`);
  if (dryRun) log("DRY RUN mode — no DB writes will be performed");

  // Verify the directory exists
  try {
    await stat(parsedSkillsDir);
  } catch {
    console.error(`ERROR: Directory not found: ${parsedSkillsDir}`);
    process.exit(1);
  }

  // Pass 1: Discover and import skills
  log("Pass 1: Importing skills...");
  const skillDirs = await discoverSkillDirs(parsedSkillsDir);
  log(`Found ${skillDirs.length} skill directories`);

  const imported: ImportedSkill[] = [];
  let errorCount = 0;

  for (const dir of skillDirs) {
    try {
      const result = await importSkill(dir);
      if (result) imported.push(result);
    } catch (err) {
      errorCount++;
      log(`ERROR importing ${basename(dir)}:`, err);
    }
  }

  log(`Pass 1 complete: ${imported.length} skills imported, ${errorCount} errors`);

  // Pass 2: Resolve cross-references
  log("Pass 2: Resolving cross-references...");
  const slugMap = await buildSlugMap();
  log(`Slug map built: ${slugMap.size} entries`);

  const refsUpdated = await resolveAllCrossRefs(slugMap);
  log(`Pass 2 complete: ${refsUpdated} skills updated with cross-references`);

  // Summary
  log("─── Summary ───");
  log(`  Skills imported:  ${imported.length}`);
  log(`  Cross-refs fixed: ${refsUpdated}`);
  log(`  Errors:           ${errorCount}`);
  log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
