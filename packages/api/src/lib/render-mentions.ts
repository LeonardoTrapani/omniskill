import { eq, inArray } from "drizzle-orm";

import { db } from "@better-skills/db";
import { skill, skillResource } from "@better-skills/db/schema/skills";
import {
  renderPersistedMentionsWithLinks,
  renderPersistedMentionsWithoutLinks,
  type MentionResourceRenderInfo,
} from "@better-skills/markdown/render-persisted-mentions";

import { parseMentions } from "./mentions";

export async function renderMentions(
  markdown: string,
  options?: {
    currentSkillId?: string;
    linkMentions?: boolean;
  },
): Promise<string> {
  const { currentSkillId, linkMentions = false } = options ?? {};

  const mentions = parseMentions(markdown);

  const skillIds = mentions.filter((m) => m.type === "skill").map((m) => m.targetId);
  const resourceIds = mentions.filter((m) => m.type === "resource").map((m) => m.targetId);

  // batch-fetch skill names
  const skillNameMap = new Map<string, string>();
  if (skillIds.length > 0) {
    const rows = (await db
      .select({ id: skill.id, name: skill.name })
      .from(skill)
      .where(inArray(skill.id, skillIds))
      .execute()) as Array<{ id: string; name: string }>;
    for (const row of rows) {
      skillNameMap.set(row.id, row.name);
    }
  }

  // batch-fetch resource paths + parent skill names
  const resourceInfoMap = new Map<string, MentionResourceRenderInfo>();
  if (resourceIds.length > 0) {
    const rows = await db
      .select({
        id: skillResource.id,
        path: skillResource.path,
        skillId: skillResource.skillId,
        skillName: skill.name,
      })
      .from(skillResource)
      .innerJoin(skill, eq(skill.id, skillResource.skillId))
      .where(inArray(skillResource.id, resourceIds))
      .execute();

    for (const row of rows) {
      resourceInfoMap.set(row.id, {
        resourcePath: row.path,
        skillName: row.skillName,
        skillId: row.skillId,
      });
    }
  }

  const renderOptions = {
    currentSkillId,
    skillNameById: skillNameMap,
    resourceInfoById: resourceInfoMap,
  };

  if (linkMentions) {
    return renderPersistedMentionsWithLinks(markdown, renderOptions);
  }

  return renderPersistedMentionsWithoutLinks(markdown, renderOptions);
}
