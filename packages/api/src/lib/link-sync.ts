import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@omniskill/db";
import { skill, skillLink, skillResource } from "@omniskill/db/schema/skills";

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

/**
 * Replace all auto-generated skill_link edges for a source skill
 * with the current set of [[...]] mentions found in the markdown.
 * Manual links (without origin: "markdown-auto") are left untouched.
 *
 * Same-owner constraint: all mentions must point to existing targets
 * with the same owner as the source skill. Missing or cross-owner
 * targets raise MentionValidationError.
 *
 * The delete + insert runs sequentially. If the insert fails the
 * auto-links are re-synced on the next edit, so the atomicity
 * trade-off is acceptable.
 */
export async function syncAutoLinks(
  sourceSkillId: string,
  markdown: string,
  userId: string,
): Promise<void> {
  // resolve the source skill's owner
  const sourceSkillRows = await db
    .select({ ownerUserId: skill.ownerUserId })
    .from(skill)
    .where(eq(skill.id, sourceSkillId))
    .limit(1)
    .execute();

  const sourceSkill = sourceSkillRows[0];

  if (!sourceSkill) return;

  await validateMentionTargets(markdown, sourceSkill.ownerUserId);
  const mentions = parseMentions(markdown);

  // delete existing auto-links, then insert current ones
  await db
    .delete(skillLink)
    .where(
      and(
        eq(skillLink.sourceSkillId, sourceSkillId),
        sql`${skillLink.metadata}->>'origin' = 'markdown-auto'`,
      ),
    )
    .execute();

  if (mentions.length === 0) return;

  const values = mentions.map((m) => ({
    sourceSkillId,
    sourceResourceId: null,
    targetSkillId: m.type === "skill" ? m.targetId : null,
    targetResourceId: m.type === "resource" ? m.targetId : null,
    kind: "mention" as const,
    metadata: { origin: "markdown-auto" } as Record<string, unknown>,
    createdByUserId: userId,
  }));

  await db.insert(skillLink).values(values).execute();
}
