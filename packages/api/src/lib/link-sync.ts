import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@better-skills/db";
import { skill, skillLink, skillResource } from "@better-skills/db/schema/skills";

import { findInvalidMentionTokens, parseMentions, type Mention } from "./mentions";

export interface MentionSyntaxIssue {
  type: "skill" | "resource";
  target: string;
}

export interface MentionValidationIssue {
  type: "skill" | "resource";
  targetId: string;
  reason: "target_not_found" | "target_not_owned";
}

interface MentionValidationOptions {
  allowSkillIds?: ReadonlySet<string>;
  allowResourceIds?: ReadonlySet<string>;
}

export type AutoLinkSourceInput =
  | {
      type: "skill";
      sourceId: string;
      sourceOwnerUserId: string | null;
      markdown: string;
    }
  | {
      type: "resource";
      sourceId: string;
      sourceOwnerUserId: string | null;
      markdown: string;
    };

function formatMentionSyntaxMessage(issues: MentionSyntaxIssue[]): string {
  const details = issues
    .map((issue) => `[[${issue.type}:${issue.target}]] target must be a uuid`)
    .join("; ");

  return `Invalid mention syntax: ${details}`;
}

export class MentionSyntaxError extends Error {
  constructor(public readonly issues: MentionSyntaxIssue[]) {
    super(formatMentionSyntaxMessage(issues));
    this.name = "MentionSyntaxError";
  }
}

function formatMentionValidationMessage(issues: MentionValidationIssue[]): string {
  const details = issues
    .map((issue) => {
      const token = `[[${issue.type}:${issue.targetId}]]`;
      if (issue.reason === "target_not_owned") {
        return `${token} belongs to another owner`;
      }
      return `${token} not found`;
    })
    .join("; ");

  return `Invalid mention targets: ${details}`;
}

export class MentionValidationError extends Error {
  constructor(public readonly issues: MentionValidationIssue[]) {
    super(formatMentionValidationMessage(issues));
    this.name = "MentionValidationError";
  }
}

async function validateMentionTargetsFromMentions(
  mentions: Mention[],
  sourceOwner: string | null,
  options?: MentionValidationOptions,
): Promise<void> {
  if (mentions.length === 0) {
    return;
  }

  const allowedSkillIds = options?.allowSkillIds;
  const allowedResourceIds = options?.allowResourceIds;

  const skillMentionIds = mentions
    .filter((mention) => mention.type === "skill" && !allowedSkillIds?.has(mention.targetId))
    .map((mention) => mention.targetId);

  const resourceMentionIds = mentions
    .filter((mention) => mention.type === "resource" && !allowedResourceIds?.has(mention.targetId))
    .map((mention) => mention.targetId);

  const existingSkills = new Map<string, string | null>();
  if (skillMentionIds.length > 0) {
    const rows = await db
      .select({ id: skill.id, ownerUserId: skill.ownerUserId })
      .from(skill)
      .where(inArray(skill.id, skillMentionIds))
      .execute();

    for (const row of rows) {
      existingSkills.set(row.id, row.ownerUserId);
    }
  }

  const existingResources = new Map<string, string | null>();
  if (resourceMentionIds.length > 0) {
    const rows = await db
      .select({
        id: skillResource.id,
        ownerUserId: skill.ownerUserId,
      })
      .from(skillResource)
      .innerJoin(skill, eq(skillResource.skillId, skill.id))
      .where(inArray(skillResource.id, resourceMentionIds))
      .execute();

    for (const row of rows) {
      existingResources.set(row.id, row.ownerUserId);
    }
  }

  const issues: MentionValidationIssue[] = [];

  for (const mention of mentions) {
    if (mention.type === "skill") {
      if (allowedSkillIds?.has(mention.targetId)) {
        continue;
      }

      const targetOwner = existingSkills.get(mention.targetId);
      if (targetOwner === undefined) {
        issues.push({
          type: "skill",
          targetId: mention.targetId,
          reason: "target_not_found",
        });
        continue;
      }

      if (targetOwner !== sourceOwner) {
        issues.push({
          type: "skill",
          targetId: mention.targetId,
          reason: "target_not_owned",
        });
      }
      continue;
    }

    if (allowedResourceIds?.has(mention.targetId)) {
      continue;
    }

    const targetOwner = existingResources.get(mention.targetId);
    if (targetOwner === undefined) {
      issues.push({
        type: "resource",
        targetId: mention.targetId,
        reason: "target_not_found",
      });
      continue;
    }

    if (targetOwner !== sourceOwner) {
      issues.push({
        type: "resource",
        targetId: mention.targetId,
        reason: "target_not_owned",
      });
    }
  }

  if (issues.length > 0) {
    throw new MentionValidationError(issues);
  }
}

export async function validateMentionTargets(
  markdown: string,
  sourceOwner: string | null,
  options?: MentionValidationOptions,
): Promise<void> {
  const invalidTokens = findInvalidMentionTokens(markdown);
  if (invalidTokens.length > 0) {
    throw new MentionSyntaxError(invalidTokens);
  }

  const mentions = parseMentions(markdown);
  await validateMentionTargetsFromMentions(mentions, sourceOwner, options);
}

async function syncAutoLinksForSource(source: AutoLinkSourceInput, userId: string): Promise<void> {
  await validateMentionTargets(source.markdown, source.sourceOwnerUserId);
  const mentions = parseMentions(source.markdown);

  const sourceCondition =
    source.type === "skill"
      ? eq(skillLink.sourceSkillId, source.sourceId)
      : eq(skillLink.sourceResourceId, source.sourceId);

  await db
    .delete(skillLink)
    .where(and(sourceCondition, sql`${skillLink.metadata}->>'origin' = 'markdown-auto'`))
    .execute();

  if (mentions.length === 0) return;

  const values = mentions.map((m) => ({
    sourceSkillId: source.type === "skill" ? source.sourceId : null,
    sourceResourceId: source.type === "resource" ? source.sourceId : null,
    targetSkillId: m.type === "skill" ? m.targetId : null,
    targetResourceId: m.type === "resource" ? m.targetId : null,
    kind: "mention" as const,
    metadata: { origin: "markdown-auto" } as Record<string, unknown>,
    createdByUserId: userId,
  }));

  await db.insert(skillLink).values(values).execute();
}

export async function syncAutoLinks(sources: AutoLinkSourceInput[], userId: string): Promise<void> {
  if (sources.length === 0) return;

  const dedupedSources = new Map<string, AutoLinkSourceInput>();
  for (const source of sources) {
    dedupedSources.set(`${source.type}:${source.sourceId.toLowerCase()}`, {
      ...source,
      sourceId: source.sourceId.toLowerCase(),
    });
  }

  for (const source of dedupedSources.values()) {
    await syncAutoLinksForSource(source, userId);
  }
}
