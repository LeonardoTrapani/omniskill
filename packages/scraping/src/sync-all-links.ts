#!/usr/bin/env bun
/**
 * Sync Auto Links for all skills
 *
 * Parses [[skill:uuid]] and [[resource:uuid]] mentions from skill markdown
 * and creates corresponding skill_link entries.
 */
import { parseArgs } from "node:util";

import { eq, and, isNull, inArray } from "drizzle-orm";
import { sql as dsql } from "drizzle-orm";

import { db } from "@better-skills/db/script";
import { skill, skillResource, skillLink } from "@better-skills/db/schema/skills";

const { values } = parseArgs({
  options: {
    verbose: { type: "boolean", short: "v", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});
const verbose = values.verbose ?? false;
const dryRun = values["dry-run"] ?? false;

function log(...args: unknown[]) {
  console.log("[sync-links]", ...args);
}
function debug(...args: unknown[]) {
  if (verbose) console.log("[debug]", ...args);
}

// Inline parseMentions (same logic as packages/api/src/lib/mentions.ts)
type MentionType = "skill" | "resource";
interface Mention {
  type: MentionType;
  targetId: string;
}

function parseMentions(markdown: string): Mention[] {
  const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const MENTION_RE = new RegExp(`\\[\\[(skill|resource):(${UUID_RE})\\]\\]`, "gi");
  const seen = new Set<string>();
  const mentions: Mention[] = [];
  let match: RegExpExecArray | null;
  while ((match = MENTION_RE.exec(markdown)) !== null) {
    const type = match[1]!.toLowerCase() as MentionType;
    const targetId = match[2]!.toLowerCase();
    const key = `${type}:${targetId}`;
    if (!seen.has(key)) {
      seen.add(key);
      mentions.push({ type, targetId });
    }
  }
  return mentions;
}

async function main() {
  log("Fetching all public platform skills...");

  const skills = await db
    .select({ id: skill.id, slug: skill.slug, markdown: skill.skillMarkdown })
    .from(skill)
    .where(and(eq(skill.visibility, "public"), isNull(skill.ownerUserId)));

  log(`Found ${skills.length} skills`);

  let totalLinks = 0;
  let skillsWithLinks = 0;

  for (const s of skills) {
    const mentions = parseMentions(s.markdown);
    if (mentions.length === 0) {
      debug(`${s.slug}: no mentions`);
      continue;
    }

    const skillMentionIds = mentions.filter((m) => m.type === "skill").map((m) => m.targetId);
    const resourceMentionIds = mentions.filter((m) => m.type === "resource").map((m) => m.targetId);

    // Validate skill mentions exist
    const existingSkillIds = new Set<string>();
    if (skillMentionIds.length > 0) {
      const rows = await db
        .select({ id: skill.id })
        .from(skill)
        .where(inArray(skill.id, skillMentionIds));
      for (const r of rows) existingSkillIds.add(r.id);
    }

    // Validate resource mentions exist
    const existingResourceIds = new Set<string>();
    if (resourceMentionIds.length > 0) {
      const rows = await db
        .select({ id: skillResource.id })
        .from(skillResource)
        .where(inArray(skillResource.id, resourceMentionIds));
      for (const r of rows) existingResourceIds.add(r.id);
    }

    const validMentions = mentions.filter((m) =>
      m.type === "skill" ? existingSkillIds.has(m.targetId) : existingResourceIds.has(m.targetId),
    );

    if (validMentions.length === 0) {
      debug(`${s.slug}: ${mentions.length} mentions but none valid`);
      continue;
    }

    debug(
      `${s.slug}: ${validMentions.length} valid mentions (${skillMentionIds.length} skill, ${resourceMentionIds.length} resource)`,
    );

    if (!dryRun) {
      // Delete existing auto links
      await db
        .delete(skillLink)
        .where(
          and(
            eq(skillLink.sourceSkillId, s.id),
            dsql`${skillLink.metadata}->>'origin' = 'markdown-auto'`,
          ),
        );

      // Insert new links (no userId for script — use null)
      const linkValues = validMentions.map((m) => ({
        sourceSkillId: s.id,
        sourceResourceId: null,
        targetSkillId: m.type === "skill" ? m.targetId : null,
        targetResourceId: m.type === "resource" ? m.targetId : null,
        kind: "mention" as const,
        metadata: { origin: "markdown-auto" } as Record<string, unknown>,
        createdByUserId: null,
      }));

      await db.insert(skillLink).values(linkValues);
    }

    totalLinks += validMentions.length;
    skillsWithLinks++;
  }

  log("─".repeat(60));
  log(`Skills with links: ${skillsWithLinks}`);
  log(`Total links created: ${totalLinks}`);
  if (dryRun) log("(dry-run mode — no changes written)");
  log("Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
