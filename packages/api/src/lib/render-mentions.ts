import { eq, inArray } from "drizzle-orm";

import { db } from "@better-skills/db";
import { skill, skillResource } from "@better-skills/db/schema/skills";
import {
  renderPersistedMentionsWithLinks,
  renderPersistedMentionsWithoutLinks,
  type MentionResourceRenderInfo,
} from "@better-skills/markdown/render-persisted-mentions";

import { parseMentions } from "./mentions";

type RenderMentionsInput = {
  markdown: string;
  currentSkillId?: string;
};

export async function renderMentionsBatch(
  inputs: RenderMentionsInput[],
  options?: {
    linkMentions?: boolean;
  },
): Promise<string[]> {
  if (inputs.length === 0) {
    return [];
  }

  const linkMentions = options?.linkMentions ?? false;

  const skillIds = new Set<string>();
  const resourceIds = new Set<string>();

  for (const input of inputs) {
    const mentions = parseMentions(input.markdown);

    for (const mention of mentions) {
      if (mention.type === "skill") {
        skillIds.add(mention.targetId);
      } else {
        resourceIds.add(mention.targetId);
      }
    }
  }

  const skillIdList = [...skillIds];
  const resourceIdList = [...resourceIds];

  // batch-fetch skill names
  const skillNameMap = new Map<string, string>();
  if (skillIdList.length > 0) {
    const rows = (await db
      .select({ id: skill.id, name: skill.name })
      .from(skill)
      .where(inArray(skill.id, skillIdList))
      .execute()) as Array<{ id: string; name: string }>;
    for (const row of rows) {
      skillNameMap.set(row.id, row.name);
    }
  }

  // batch-fetch resource paths + parent skill names
  const resourceInfoMap = new Map<string, MentionResourceRenderInfo>();
  if (resourceIdList.length > 0) {
    const rows = await db
      .select({
        id: skillResource.id,
        path: skillResource.path,
        skillId: skillResource.skillId,
        skillName: skill.name,
      })
      .from(skillResource)
      .innerJoin(skill, eq(skill.id, skillResource.skillId))
      .where(inArray(skillResource.id, resourceIdList))
      .execute();

    for (const row of rows) {
      resourceInfoMap.set(row.id, {
        resourcePath: row.path,
        skillName: row.skillName,
        skillId: row.skillId,
      });
    }
  }

  return inputs.map((input) => {
    const renderOptions = {
      currentSkillId: input.currentSkillId,
      skillNameById: skillNameMap,
      resourceInfoById: resourceInfoMap,
    };

    if (linkMentions) {
      return renderPersistedMentionsWithLinks(input.markdown, renderOptions);
    }

    return renderPersistedMentionsWithoutLinks(input.markdown, renderOptions);
  });
}

export async function renderMentions(
  markdown: string,
  options?: {
    currentSkillId?: string;
    linkMentions?: boolean;
  },
): Promise<string> {
  const rendered = await renderMentionsBatch(
    [{ markdown, currentSkillId: options?.currentSkillId }],
    { linkMentions: options?.linkMentions },
  );

  return rendered[0] ?? markdown;
}
