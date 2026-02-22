import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@omniscient/db";
import { skill, skillLink, skillResource } from "@omniscient/db/schema/skills";

import { parseMentions } from "./mentions";

/**
 * Replace all auto-generated skill_link edges for a source skill
 * with the current set of [[...]] mentions found in the markdown.
 * Manual links (without origin: "markdown-auto") are left untouched.
 *
 * Same-owner constraint: only mentions whose target belongs to the
 * same owner as the source skill produce link edges. Cross-owner
 * mentions are silently skipped (consistent with non-existent targets).
 *
 * The delete + insert runs sequentially (neon-http doesn't support
 * transactions). If the insert fails the auto-links are re-synced on
 * the next edit, so the atomicity trade-off is acceptable.
 */
export async function syncAutoLinks(
  sourceSkillId: string,
  markdown: string,
  userId: string,
): Promise<void> {
  const mentions = parseMentions(markdown);

  // resolve the source skill's owner
  const [sourceSkill] = await db
    .select({ ownerUserId: skill.ownerUserId })
    .from(skill)
    .where(eq(skill.id, sourceSkillId));

  if (!sourceSkill) return;

  const sourceOwner = sourceSkill.ownerUserId;

  const skillMentionIds = mentions.filter((m) => m.type === "skill").map((m) => m.targetId);
  const resourceMentionIds = mentions.filter((m) => m.type === "resource").map((m) => m.targetId);

  // fetch mentioned skills with their owner
  const existingSkills = new Map<string, string | null>();
  if (skillMentionIds.length > 0) {
    const rows = await db
      .select({ id: skill.id, ownerUserId: skill.ownerUserId })
      .from(skill)
      .where(inArray(skill.id, skillMentionIds));

    for (const row of rows) {
      existingSkills.set(row.id, row.ownerUserId);
    }
  }

  // fetch mentioned resources with their parent skill's owner
  const existingResources = new Map<string, string | null>();
  if (resourceMentionIds.length > 0) {
    const rows = await db
      .select({
        id: skillResource.id,
        ownerUserId: skill.ownerUserId,
      })
      .from(skillResource)
      .innerJoin(skill, eq(skillResource.skillId, skill.id))
      .where(inArray(skillResource.id, resourceMentionIds));

    for (const row of rows) {
      existingResources.set(row.id, row.ownerUserId);
    }
  }

  // keep only mentions that exist AND belong to the same owner
  const validMentions = mentions.filter((mention) => {
    if (mention.type === "skill") {
      const targetOwner = existingSkills.get(mention.targetId);
      return targetOwner !== undefined && targetOwner === sourceOwner;
    }
    const targetOwner = existingResources.get(mention.targetId);
    return targetOwner !== undefined && targetOwner === sourceOwner;
  });

  // delete existing auto-links, then insert current ones
  await db
    .delete(skillLink)
    .where(
      and(
        eq(skillLink.sourceSkillId, sourceSkillId),
        sql`${skillLink.metadata}->>'origin' = 'markdown-auto'`,
      ),
    );

  if (validMentions.length === 0) return;

  const values = validMentions.map((m) => ({
    sourceSkillId,
    sourceResourceId: null,
    targetSkillId: m.type === "skill" ? m.targetId : null,
    targetResourceId: m.type === "resource" ? m.targetId : null,
    kind: "mention" as const,
    metadata: { origin: "markdown-auto" } as Record<string, unknown>,
    createdByUserId: userId,
  }));

  await db.insert(skillLink).values(values);
}
