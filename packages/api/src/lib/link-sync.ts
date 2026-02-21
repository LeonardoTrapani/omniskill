import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@omniscient/db";
import { skill, skillLink, skillResource } from "@omniscient/db/schema/skills";

import { parseMentions } from "./mentions";

/**
 * Replace all auto-generated skill_link edges for a source skill
 * with the current set of [[...]] mentions found in the markdown.
 * Manual links (without origin: "markdown-auto") are left untouched.
 */
export async function syncAutoLinks(
  sourceSkillId: string,
  markdown: string,
  userId: string,
): Promise<void> {
  const mentions = parseMentions(markdown);

  const skillMentionIds = mentions.filter((m) => m.type === "skill").map((m) => m.targetId);
  const resourceMentionIds = mentions.filter((m) => m.type === "resource").map((m) => m.targetId);

  const existingSkillIds = new Set<string>();
  if (skillMentionIds.length > 0) {
    const rows = await db
      .select({ id: skill.id })
      .from(skill)
      .where(inArray(skill.id, skillMentionIds));

    for (const row of rows) {
      existingSkillIds.add(row.id);
    }
  }

  const existingResourceIds = new Set<string>();
  if (resourceMentionIds.length > 0) {
    const rows = await db
      .select({ id: skillResource.id })
      .from(skillResource)
      .where(inArray(skillResource.id, resourceMentionIds));

    for (const row of rows) {
      existingResourceIds.add(row.id);
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
      return existingSkillIds.has(mention.targetId);
    }
    return existingResourceIds.has(mention.targetId);
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
