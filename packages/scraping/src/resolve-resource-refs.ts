#!/usr/bin/env bun
/**
 * Resolve Resource References Script
 *
 * Replaces textual references to resources (references/, scripts/, assets/)
 * in skill markdown with [[resource:<uuid>]] tokens.
 *
 * Usage:
 *   DATABASE_URL="..." bun run packages/db/src/scripts/resolve-resource-refs.ts -v
 *   DATABASE_URL="..." bun run packages/db/src/scripts/resolve-resource-refs.ts -v --write-files --dir ./parsed-skills
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { eq, and, isNull } from "drizzle-orm";

import { db } from "@omniscient/db/script";
import { skill, skillResource } from "@omniscient/db/schema/skills";

// ─── CLI args ────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    dir: { type: "string", short: "d" },
    "dry-run": { type: "boolean", default: false },
    "write-files": { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

const dryRun = values["dry-run"] ?? false;
const writeFiles = values["write-files"] ?? false;
const outputDir = resolve(values.dir ?? "./parsed-skills");
const verbose = values.verbose ?? false;

function log(...args: unknown[]) {
  console.log("[resolve-refs]", ...args);
}

function debug(...args: unknown[]) {
  if (verbose) console.log("[debug]", ...args);
}

// ─── Path normalization ──────────────────────────────────────────────────────

function normalizePath(raw: string): string {
  let p = raw;
  // strip leading ./
  if (p.startsWith("./")) p = p.slice(2);
  // strip anchor (#section)
  const hashIdx = p.indexOf("#");
  if (hashIdx !== -1) p = p.slice(0, hashIdx);
  // strip query string
  const qIdx = p.indexOf("?");
  if (qIdx !== -1) p = p.slice(0, qIdx);
  return p;
}

// ─── Replacement logic ──────────────────────────────────────────────────────

interface ReplacementResult {
  markdown: string;
  resolved: number;
  unresolved: string[];
}

function resolveResourceRefs(
  markdown: string,
  resourceMap: Map<string, string>, // path → uuid
  skillSlug: string,
): ReplacementResult {
  let result = markdown;
  let resolved = 0;
  const unresolved: string[] = [];

  function lookup(rawPath: string): string | null {
    const normalized = normalizePath(rawPath);
    return resourceMap.get(normalized) ?? null;
  }

  function replacePath(
    rawPath: string,
    original: string,
    replacement: (uuid: string) => string,
  ): string {
    const uuid = lookup(rawPath);
    if (uuid) {
      resolved++;
      return replacement(uuid);
    }
    unresolved.push(rawPath);
    return original;
  }

  // Order matters: most specific patterns first

  // 1. Markdown links [text](./references/...) and [text](./scripts/...) and [text](./assets/...)
  result = result.replace(
    /\[([^\]]+)\]\(\.\/(references|scripts|assets)\/([^)]+)\)/g,
    (match, text, dir, file) =>
      replacePath(`${dir}/${file}`, match, (uuid) => `[[resource:${uuid}]]`),
  );

  // 2. Markdown links [text](references/...) and [text](scripts/...) and [text](assets/...)
  result = result.replace(
    /\[([^\]]+)\]\((references|scripts|assets)\/([^)]+)\)/g,
    (match, text, dir, file) =>
      replacePath(`${dir}/${file}`, match, (uuid) => `[[resource:${uuid}]]`),
  );

  // 3. Arrow → references/... (and scripts/, assets/)
  result = result.replace(/→ (references|scripts|assets)\/(\S+)/g, (match, dir, file) =>
    replacePath(`${dir}/${file}`, match, (uuid) => `→ [[resource:${uuid}]]`),
  );

  // 4. Bold **references/...** (and scripts/, assets/)
  result = result.replace(/\*\*(references|scripts|assets)\/([^*]+)\*\*/g, (match, dir, file) =>
    replacePath(`${dir}/${file}`, match, (uuid) => `[[resource:${uuid}]]`),
  );

  // 5. Backtick `references/...` (and scripts/, assets/)
  result = result.replace(/`(references|scripts|assets)\/([^`]+)`/g, (match, dir, file) =>
    replacePath(`${dir}/${file}`, match, (uuid) => `[[resource:${uuid}]]`),
  );

  return { markdown: result, resolved, unresolved };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log("Fetching skills and resources from DB...");

  // Fetch all public platform skills
  const skills = await db
    .select({
      id: skill.id,
      slug: skill.slug,
      skillMarkdown: skill.skillMarkdown,
    })
    .from(skill)
    .where(and(eq(skill.visibility, "public"), isNull(skill.ownerUserId)));

  log(`Found ${skills.length} public platform skills`);

  // Fetch all resources
  const resources = await db
    .select({
      id: skillResource.id,
      skillId: skillResource.skillId,
      path: skillResource.path,
    })
    .from(skillResource);

  log(`Found ${resources.length} total resources`);

  // Build map: skillId → Map<path, uuid>
  const skillResourceMap = new Map<string, Map<string, string>>();
  for (const r of resources) {
    let map = skillResourceMap.get(r.skillId);
    if (!map) {
      map = new Map();
      skillResourceMap.set(r.skillId, map);
    }
    map.set(r.path, r.id);
  }

  // Process each skill
  let totalResolved = 0;
  let totalUnresolved = 0;
  let skillsUpdated = 0;
  const allWarnings: Array<{ slug: string; path: string }> = [];

  for (const s of skills) {
    const resourceMap = skillResourceMap.get(s.id);
    if (!resourceMap || resourceMap.size === 0) {
      debug(`${s.slug}: no resources, skipping`);
      continue;
    }

    const { markdown, resolved, unresolved } = resolveResourceRefs(
      s.skillMarkdown,
      resourceMap,
      s.slug,
    );

    if (resolved === 0 && unresolved.length === 0) {
      debug(`${s.slug}: no references found`);
      continue;
    }

    totalResolved += resolved;
    totalUnresolved += unresolved.length;

    for (const path of unresolved) {
      allWarnings.push({ slug: s.slug, path });
    }

    if (resolved > 0) {
      debug(`${s.slug}: resolved ${resolved} refs, ${unresolved.length} unresolved`);
      skillsUpdated++;

      if (!dryRun) {
        // Update DB
        await db.update(skill).set({ skillMarkdown: markdown }).where(eq(skill.id, s.id));

        // Optionally write file to disk
        if (writeFiles) {
          const skillDir = join(outputDir, s.slug);
          await mkdir(skillDir, { recursive: true });
          await writeFile(join(skillDir, "SKILL.md"), markdown, "utf-8");
        }
      }
    }
  }

  // Summary
  log("─".repeat(60));
  log(`Skills updated:       ${skillsUpdated}`);
  log(`References resolved:  ${totalResolved}`);
  log(`References unresolved: ${totalUnresolved}`);
  if (dryRun) log("(dry-run mode — no changes written)");

  if (allWarnings.length > 0) {
    log("\nUnresolved references:");
    for (const w of allWarnings) {
      log(`  ⚠ ${w.slug}: ${w.path}`);
    }
  }

  log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
