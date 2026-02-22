import { inArray } from "drizzle-orm";

import { db } from "@omniscient/db";
import { skill, skillResource } from "@omniscient/db/schema/skills";

import { parseMentions } from "./mentions";

const SKILL_FALLBACK = "`(unknown skill)`";
const RESOURCE_FALLBACK = "`(unknown resource)`";

export async function renderMentions(markdown: string, currentSkillId?: string): Promise<string> {
  const mentions = parseMentions(markdown);
  if (mentions.length === 0) return markdown;

  const skillIds = mentions.filter((m) => m.type === "skill").map((m) => m.targetId);
  const resourceIds = mentions.filter((m) => m.type === "resource").map((m) => m.targetId);

  // batch-fetch skill slugs
  const skillSlugMap = new Map<string, string>();
  if (skillIds.length > 0) {
    const rows = (await db
      .select({ id: skill.id, slug: skill.slug })
      .from(skill)
      .where(inArray(skill.id, skillIds))
      .execute()) as Array<{ id: string; slug: string }>;
    for (const row of rows) {
      skillSlugMap.set(row.id, row.slug);
    }
  }

  // batch-fetch resource paths + parent skill slugs
  const resourceInfoMap = new Map<
    string,
    { resourcePath: string; skillSlug: string; skillId: string }
  >();
  if (resourceIds.length > 0) {
    const rows = (await db
      .select({
        id: skillResource.id,
        path: skillResource.path,
        skillId: skillResource.skillId,
      })
      .from(skillResource)
      .where(inArray(skillResource.id, resourceIds))
      .execute()) as Array<{ id: string; path: string; skillId: string }>;

    const parentSkillIds = [...new Set(rows.map((r) => r.skillId))];
    const parentSkillSlugMap = new Map<string, string>();
    if (parentSkillIds.length > 0) {
      const parentRows = (await db
        .select({ id: skill.id, slug: skill.slug })
        .from(skill)
        .where(inArray(skill.id, parentSkillIds))
        .execute()) as Array<{ id: string; slug: string }>;
      for (const row of parentRows) {
        parentSkillSlugMap.set(row.id, row.slug);
      }
    }

    for (const row of rows) {
      resourceInfoMap.set(row.id, {
        resourcePath: row.path,
        skillSlug: parentSkillSlugMap.get(row.skillId) ?? "(unknown skill)",
        skillId: row.skillId,
      });
    }
  }

  const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const MENTION_RE = new RegExp(`\\[\\[(skill|resource):(${UUID_RE})\\]\\]`, "gi");

  return markdown.replace(MENTION_RE, (_match, type: string, targetId: string) => {
    const normalizedType = type.toLowerCase();
    const normalizedId = targetId.toLowerCase();

    if (normalizedType === "skill") {
      const slug = skillSlugMap.get(normalizedId);
      if (slug) return `[\`${slug}\`](skill://${normalizedId})`;
      return SKILL_FALLBACK;
    }

    if (normalizedType === "resource") {
      const info = resourceInfoMap.get(normalizedId);
      if (info) {
        const sameSkill =
          currentSkillId && info.skillId.toLowerCase() === currentSkillId.toLowerCase();
        if (sameSkill) {
          return `[\`${info.resourcePath}\`](resource://${normalizedId})`;
        }
        return `[\`${info.resourcePath}\`](resource://${normalizedId}) in [\`${info.skillSlug}\`](skill://${info.skillId})`;
      }
      return RESOURCE_FALLBACK;
    }

    return _match;
  });
}
