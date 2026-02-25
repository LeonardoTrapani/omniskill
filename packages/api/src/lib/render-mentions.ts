import { eq, inArray } from "drizzle-orm";

import { db } from "@omniskill/db";
import { skill, skillResource } from "@omniskill/db/schema/skills";

import { parseMentions } from "./mentions";

const SKILL_FALLBACK = "`(unknown skill)`";
const RESOURCE_FALLBACK = "`(unknown resource)`";

function buildMentionQuery(type: "skill" | "resource", id: string) {
  const params = new URLSearchParams({ mention: `${type}:${id}` });
  return `?${params.toString()}`;
}

function buildSkillHref(skillId: string) {
  return `/dashboard/skills/${encodeURIComponent(skillId)}${buildMentionQuery("skill", skillId)}`;
}

function buildResourceHref(skillId: string, resourcePath: string, resourceId: string) {
  const encodedPath = resourcePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `/dashboard/skills/${encodeURIComponent(skillId)}/resources/${encodedPath}${buildMentionQuery("resource", resourceId)}`;
}

export async function renderMentions(
  markdown: string,
  options?: {
    currentSkillId?: string;
    linkMentions?: boolean;
  },
): Promise<string> {
  const { currentSkillId, linkMentions = false } = options ?? {};

  const mentions = parseMentions(markdown);
  if (mentions.length === 0) return markdown;

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
  const resourceInfoMap = new Map<
    string,
    { resourcePath: string; skillName: string; skillId: string }
  >();
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

  const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const MENTION_RE = new RegExp(
    `\\\\?\\[\\\\?\\[(skill|resource):(${UUID_RE})\\\\?\\]\\\\?\\]`,
    "gi",
  );

  return markdown.replace(MENTION_RE, (_match, type: string, targetId: string) => {
    const normalizedType = type.toLowerCase();
    const normalizedId = targetId.toLowerCase();

    if (normalizedType === "skill") {
      const skillName = skillNameMap.get(normalizedId);
      if (skillName) {
        const label = `\`${skillName}\``;
        if (!linkMentions) return label;
        return `[${label}](${buildSkillHref(normalizedId)})`;
      }
      return SKILL_FALLBACK;
    }

    if (normalizedType === "resource") {
      const info = resourceInfoMap.get(normalizedId);
      if (info) {
        const sameSkill =
          currentSkillId && info.skillId.toLowerCase() === currentSkillId.toLowerCase();

        const label = sameSkill
          ? `\`${info.resourcePath}\``
          : `\`${info.resourcePath} for ${info.skillName}\``;

        if (!linkMentions) return label;

        return `[${label}](${buildResourceHref(info.skillId, info.resourcePath, normalizedId)})`;
      }
      return RESOURCE_FALLBACK;
    }

    return _match;
  });
}
