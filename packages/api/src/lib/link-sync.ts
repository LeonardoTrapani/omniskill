import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@omniscient/db";
import { skillLink } from "@omniscient/db/schema/skills";

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

  // build insert values for each mention
  const values = mentions.map((m) => ({
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
