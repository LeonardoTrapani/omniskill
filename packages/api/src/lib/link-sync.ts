import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@omniscient/db";
import { skill, skillLink, skillResource } from "@omniscient/db/schema/skills";

import { parseMentions } from "./mentions";

/**
 * Replace all auto-generated skill_link edges for a source skill
 * with the current set of [[...]] mentions found in the markdown.
 * Manual links (without origin: "markdown-auto") are left untouched.
 *
 * Enforces same-owner constraint: all mentioned targets must belong
 * to the same owner as the source skill. Cross-owner links are rejected.
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

  // enforce same-owner constraint on all mentions
  for (const mention of mentions) {
    if (mention.type === "skill") {
      const targetOwner = existingSkills.get(mention.targetId);
      if (targetOwner !== undefined && targetOwner !== sourceOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Links can only reference skills owned by the same user",
        });
      }
    } else {
      const targetOwner = existingResources.get(mention.targetId);
      if (targetOwner !== undefined && targetOwner !== sourceOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Links can only reference resources owned by the same user",
        });
      }
    }
  }

  // delete existing auto-generated links for this source skill
  await db
    .delete(skillLink)
    .where(
      and(
        eq(skillLink.sourceSkillId, sourceSkillId),
        sql`${skillLink.metadata}->>'origin' = 'markdown-auto'`,
      ),
    );

  if (mentions.length === 0) return;

  const validMentions = mentions.filter((mention) => {
    if (mention.type === "skill") {
      return existingSkills.has(mention.targetId);
    }
    return existingResources.has(mention.targetId);
  });

  if (validMentions.length === 0) return;

  // build insert values for each mention
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
