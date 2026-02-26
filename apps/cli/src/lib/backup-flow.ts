import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import { parseMentions } from "@better-skills/api/lib/mentions";
import matter from "gray-matter";

import type { SupportedAgent } from "./agents";
import { getAgentDisplayName, getAgentSkillDir } from "./agents";
import { readErrorMessage } from "./errors";
import { collectNewResourceMentionPaths } from "./new-resource-mentions";
import {
  buildUpdateResourcesPayload,
  loadLocalSkillDraft,
  resolveNewResourceMentions,
  slugify,
} from "./skill-io";
import { trpc } from "./trpc";
import type { SkillFolderValidationResult } from "./validate-skill-folder";
import { validateSkillFolder } from "./validate-skill-folder";

const INSTALL_METADATA_FILE = ".better-skills-install.json";
const PLAN_VERSION = 1 as const;
const LIST_PAGE_LIMIT = 100;

type OwnedSkillsPage = Awaited<ReturnType<typeof trpc.skills.listByOwner.query>>;
type OwnedSkill = OwnedSkillsPage["items"][number];

export type BackupPlanAction = "create" | "update" | "skip";
export type BackupPlanConfidence = "high" | "medium" | "low";

export type BackupPlanOccurrence = {
  path: string;
  folder: string;
  root: string;
  source: string;
  cleanupEligible: boolean;
};

export type BackupPlanItem = {
  id: string;
  name: string;
  slug: string;
  canonicalPath: string;
  action: BackupPlanAction;
  confidence: BackupPlanConfidence;
  reason: string;
  targetSkillId: string | null;
  targetSkillSlug: string | null;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
    resources: number;
    newMentionPaths: number;
  };
  mentionSummary: {
    persistedSkillMentions: number;
    persistedResourceMentions: number;
    draftMentionPaths: number;
  };
  occurrences: BackupPlanOccurrence[];
};

export type BackupPlanSummary = {
  uniqueSkills: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  actionableCount: number;
  dedupedOccurrences: number;
};

export type BackupPlan = {
  version: typeof PLAN_VERSION;
  createdAt: string;
  linkPolicy: "preserve-current-links-only";
  source: {
    mode: "auto" | "custom";
    providedSource: string | null;
    roots: string[];
  };
  summary: BackupPlanSummary;
  skippedFolders: {
    path: string;
    reason: string;
  }[];
  items: BackupPlanItem[];
};

export type BackupPlanOptions = {
  sourceDir?: string;
  agents?: SupportedAgent[];
};

export type BackupActionDecision = {
  action: BackupPlanAction;
  confidence: BackupPlanConfidence;
  reason: string;
  target: Pick<OwnedSkill, "id" | "slug" | "name"> | null;
};

export type BackupApplyItemResult = {
  id: string;
  name: string;
  action: BackupPlanAction;
  status: "created" | "updated" | "skipped" | "failed";
  message: string;
  skillId: string | null;
  slug: string | null;
  snapshotPath: string | null;
};

export type BackupApplyResult = {
  startedAt: string;
  finishedAt: string;
  snapshotDir: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  removedLocalFolders: string[];
  cleanupWarnings: string[];
  results: BackupApplyItemResult[];
};

type DiscoveryRoot = {
  path: string;
  label: string;
  cleanupEligible: boolean;
  includeSelf: boolean;
};

type CandidateGroup = {
  fingerprint: string;
  name: string;
  slug: string;
  canonicalPath: string;
  validation: SkillFolderValidationResult;
  mentionSummary: BackupPlanItem["mentionSummary"];
  occurrences: BackupPlanOccurrence[];
};

function formatTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function expandPath(pathValue: string): string {
  if (pathValue === "~") {
    return homedir();
  }

  if (pathValue.startsWith("~/")) {
    return join(homedir(), pathValue.slice(2));
  }

  return resolve(process.cwd(), pathValue);
}

function toFingerprint(skillMarkdown: string): string {
  return createHash("sha1").update(skillMarkdown).digest("hex");
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function readSkillIdentity(
  skillMarkdown: string,
  fallbackFolder: string,
): { name: string; slug: string } {
  try {
    const { data } = matter(skillMarkdown);
    const name =
      typeof data.name === "string" && data.name.trim() ? data.name.trim() : fallbackFolder;
    const slug =
      typeof data.slug === "string" && data.slug.trim()
        ? data.slug.trim()
        : slugify(name || fallbackFolder);

    return {
      name,
      slug: slug || slugify(fallbackFolder),
    };
  } catch {
    return {
      name: fallbackFolder,
      slug: slugify(fallbackFolder),
    };
  }
}

function summarizeMentions(skillMarkdown: string): BackupPlanItem["mentionSummary"] {
  const mentions = parseMentions(skillMarkdown);

  return {
    persistedSkillMentions: mentions.filter((mention) => mention.type === "skill").length,
    persistedResourceMentions: mentions.filter((mention) => mention.type === "resource").length,
    draftMentionPaths: collectNewResourceMentionPaths(skillMarkdown).length,
  };
}

async function fetchAllOwnedSkills(): Promise<OwnedSkill[]> {
  const items: OwnedSkill[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await trpc.skills.listByOwner.query({
      limit: LIST_PAGE_LIMIT,
      cursor,
    });

    items.push(...page.items);

    if (!page.nextCursor) {
      return items;
    }

    cursor = page.nextCursor;
  }
}

function resolveDiscoveryRoots(options: BackupPlanOptions): DiscoveryRoot[] {
  if (options.sourceDir) {
    const sourcePath = expandPath(options.sourceDir);

    return [
      {
        path: sourcePath,
        label: "custom source",
        cleanupEligible: false,
        includeSelf: true,
      },
    ];
  }

  const roots: DiscoveryRoot[] = [];

  if (options.agents && options.agents.length > 0) {
    for (const agent of uniqueBy(options.agents, (entry) => entry)) {
      roots.push({
        path: getAgentSkillDir(agent),
        label: getAgentDisplayName(agent),
        cleanupEligible: true,
        includeSelf: false,
      });
    }

    return roots;
  }

  roots.push(
    {
      path: getAgentSkillDir("opencode"),
      label: getAgentDisplayName("opencode"),
      cleanupEligible: true,
      includeSelf: false,
    },
    {
      path: getAgentSkillDir("claude-code"),
      label: getAgentDisplayName("claude-code"),
      cleanupEligible: true,
      includeSelf: false,
    },
    {
      path: getAgentSkillDir("cursor"),
      label: getAgentDisplayName("cursor"),
      cleanupEligible: true,
      includeSelf: false,
    },
    {
      path: join(process.cwd(), ".agents", "skills"),
      label: "workspace .agents/skills",
      cleanupEligible: true,
      includeSelf: false,
    },
  );

  return roots;
}

async function listSkillDirs(root: DiscoveryRoot): Promise<string[]> {
  const rootStat = await stat(root.path).catch(() => null);

  if (!rootStat?.isDirectory()) {
    return [];
  }

  const folders: string[] = [];

  if (root.includeSelf) {
    const selfSkill = await stat(join(root.path, "SKILL.md")).catch(() => null);
    if (selfSkill?.isFile()) {
      folders.push(root.path);
    }
  }

  const entries = await readdir(root.path, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) {
      continue;
    }

    const skillDir = join(root.path, entry.name);
    const skillFile = await stat(join(skillDir, "SKILL.md")).catch(() => null);

    if (skillFile?.isFile()) {
      folders.push(skillDir);
    }
  }

  return folders;
}

export function decideBackupAction(
  input: { name: string; slug: string; validationOk: boolean },
  ownedSkills: Pick<OwnedSkill, "id" | "slug" | "name">[],
): BackupActionDecision {
  if (!input.validationOk) {
    return {
      action: "skip",
      confidence: "low",
      reason: "local folder validation failed",
      target: null,
    };
  }

  const slugMatches = ownedSkills.filter(
    (skill) => normalizeText(skill.slug) === normalizeText(input.slug),
  );

  if (slugMatches.length === 1) {
    return {
      action: "update",
      confidence: "high",
      reason: "matched existing skill by slug",
      target: slugMatches[0] ?? null,
    };
  }

  if (slugMatches.length > 1) {
    return {
      action: "skip",
      confidence: "low",
      reason: "multiple existing skills share this slug",
      target: null,
    };
  }

  const normalizedName = normalizeText(input.name);
  const nameMatches = ownedSkills.filter((skill) => normalizeText(skill.name) === normalizedName);

  if (nameMatches.length === 1) {
    return {
      action: "update",
      confidence: "medium",
      reason: "matched existing skill by name",
      target: nameMatches[0] ?? null,
    };
  }

  if (nameMatches.length > 1) {
    return {
      action: "skip",
      confidence: "low",
      reason: "multiple existing skills share this name",
      target: null,
    };
  }

  return {
    action: "create",
    confidence: "high",
    reason: "no matching skill found in your vault",
    target: null,
  };
}

function summarizePlan(items: BackupPlanItem[]): BackupPlanSummary {
  const createCount = items.filter((item) => item.action === "create").length;
  const updateCount = items.filter((item) => item.action === "update").length;
  const skipCount = items.filter((item) => item.action === "skip").length;
  const dedupedOccurrences = items.reduce(
    (total, item) => total + Math.max(0, item.occurrences.length - 1),
    0,
  );

  return {
    uniqueSkills: items.length,
    createCount,
    updateCount,
    skipCount,
    actionableCount: createCount + updateCount,
    dedupedOccurrences,
  };
}

export async function createBackupPlan(options: BackupPlanOptions = {}): Promise<BackupPlan> {
  const roots = resolveDiscoveryRoots(options);
  const groups = new Map<string, CandidateGroup>();
  const skippedFolders: BackupPlan["skippedFolders"] = [];
  const ownedSkills = await fetchAllOwnedSkills();

  for (const root of roots) {
    const skillDirs = await listSkillDirs(root);

    for (const skillDir of skillDirs) {
      const installMetadata = await readFile(join(skillDir, INSTALL_METADATA_FILE), "utf8").catch(
        () => null,
      );

      if (installMetadata) {
        skippedFolders.push({
          path: skillDir,
          reason: "managed by better-skills sync",
        });
        continue;
      }

      const skillMarkdown = await readFile(join(skillDir, "SKILL.md"), "utf8").catch(() => null);

      if (!skillMarkdown) {
        skippedFolders.push({
          path: skillDir,
          reason: "could not read SKILL.md",
        });
        continue;
      }

      const fingerprint = toFingerprint(skillMarkdown);
      const existingGroup = groups.get(fingerprint);
      const occurrence: BackupPlanOccurrence = {
        path: skillDir,
        folder: basename(skillDir),
        root: root.path,
        source: root.label,
        cleanupEligible: root.cleanupEligible,
      };

      if (existingGroup) {
        existingGroup.occurrences.push(occurrence);
        continue;
      }

      const identity = readSkillIdentity(skillMarkdown, basename(skillDir));
      const validation = await validateSkillFolder(skillDir);

      groups.set(fingerprint, {
        fingerprint,
        name: identity.name,
        slug: identity.slug,
        canonicalPath: skillDir,
        validation,
        mentionSummary: summarizeMentions(skillMarkdown),
        occurrences: [occurrence],
      });
    }
  }

  const items: BackupPlanItem[] = [...groups.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group) => {
      const decision = decideBackupAction(
        {
          name: group.name,
          slug: group.slug,
          validationOk: group.validation.ok,
        },
        ownedSkills,
      );

      const dedupeSuffix =
        group.occurrences.length > 1
          ? `; deduped ${group.occurrences.length} local copies into one backup source`
          : "";

      return {
        id: group.fingerprint,
        name: group.name,
        slug: group.slug,
        canonicalPath: group.canonicalPath,
        action: decision.action,
        confidence: decision.confidence,
        reason: `${decision.reason}${dedupeSuffix}`,
        targetSkillId: decision.target?.id ?? null,
        targetSkillSlug: decision.target?.slug ?? null,
        validation: {
          ok: group.validation.ok,
          errors: group.validation.errors,
          warnings: group.validation.warnings,
          resources: group.validation.resourceCount,
          newMentionPaths: group.validation.newMentionPathCount,
        },
        mentionSummary: group.mentionSummary,
        occurrences: group.occurrences,
      };
    });

  return {
    version: PLAN_VERSION,
    createdAt: new Date().toISOString(),
    linkPolicy: "preserve-current-links-only",
    source: {
      mode: options.sourceDir ? "custom" : "auto",
      providedSource: options.sourceDir ? expandPath(options.sourceDir) : null,
      roots: roots.map((root) => root.path),
    },
    summary: summarizePlan(items),
    skippedFolders,
    items,
  };
}

export async function writeBackupPlan(plan: BackupPlan, outputPath?: string): Promise<string> {
  const planPath = outputPath
    ? expandPath(outputPath)
    : join(homedir(), ".better-skills", "backups", formatTimestamp(), "plan.json");

  await mkdir(dirname(planPath), { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  return planPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readBackupPlan(planPath: string): Promise<BackupPlan> {
  const resolvedPath = expandPath(planPath);
  const raw = await readFile(resolvedPath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!isRecord(parsed)) {
    throw new Error("invalid backup plan file");
  }

  if (parsed.version !== PLAN_VERSION) {
    throw new Error(`unsupported backup plan version: ${String(parsed.version)}`);
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error("invalid backup plan: missing items array");
  }

  return parsed as BackupPlan;
}

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "skill";
}

function isSlugConflictError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("slug") &&
    (normalized.includes("duplicate") || normalized.includes("unique"))
  );
}

async function createSkillFromFolder(folder: string, preferredSlug: string) {
  const draft = await loadLocalSkillDraft(folder);
  const baseSlug = preferredSlug || slugify(draft.name);
  const attempts = [baseSlug, `${baseSlug}-2`, `${baseSlug}-3`, `${baseSlug}-4`, `${baseSlug}-5`];

  let lastError: unknown = null;

  for (const slug of attempts) {
    let createdSkill: Awaited<ReturnType<typeof trpc.skills.create.mutate>> | null = null;

    try {
      createdSkill = await trpc.skills.create.mutate({
        slug,
        name: draft.name,
        description: draft.description,
        skillMarkdown: draft.markdownForMutation,
        visibility: "private",
        frontmatter: draft.frontmatter,
        resources: draft.resources,
      });

      if (draft.newResourcePaths.length > 0) {
        const resolved = await resolveNewResourceMentions(
          createdSkill.id,
          draft,
          createdSkill.resources,
        );
        if (resolved) {
          createdSkill = resolved;
        }
      }

      return {
        createdSkill,
        slugUsed: slug,
      };
    } catch (error) {
      if (createdSkill) {
        throw new Error(`skill was created but finalization failed: ${createdSkill.id}`);
      }

      const message = readErrorMessage(error);
      lastError = error;

      if (isSlugConflictError(message)) {
        continue;
      }

      throw error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(`could not create skill for ${folder}`);
}

async function updateSkillFromFolder(skillId: string, folder: string) {
  const draft = await loadLocalSkillDraft(folder);
  const targetSkill = await trpc.skills.getById.query({ id: skillId, linkMentions: false });
  const resourcesPayload = buildUpdateResourcesPayload(targetSkill.resources, draft.resources);

  let updatedSkill = await trpc.skills.update.mutate({
    id: targetSkill.id,
    name: draft.name,
    description: draft.description,
    skillMarkdown: draft.markdownForMutation,
    visibility: targetSkill.visibility,
    frontmatter: draft.frontmatter,
    resources: resourcesPayload,
  });

  if (draft.newResourcePaths.length > 0) {
    const resolved = await resolveNewResourceMentions(
      updatedSkill.id,
      draft,
      updatedSkill.resources,
    );
    if (resolved) {
      updatedSkill = resolved;
    }
  }

  return updatedSkill;
}

function isSafeCleanupPath(occurrence: BackupPlanOccurrence): boolean {
  const resolvedPath = resolve(occurrence.path);
  const resolvedRoot = resolve(occurrence.root);

  if (resolvedPath === "/") {
    return false;
  }

  return resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}/`);
}

export async function applyBackupPlan(
  plan: BackupPlan,
  options: {
    planPath?: string;
  } = {},
): Promise<BackupApplyResult> {
  const startedAt = new Date().toISOString();
  const baseDir = options.planPath
    ? dirname(expandPath(options.planPath))
    : join(homedir(), ".better-skills", "backups", formatTimestamp());
  const snapshotDir = join(baseDir, `snapshot-${formatTimestamp()}`);

  await mkdir(snapshotDir, { recursive: true });

  const results: BackupApplyItemResult[] = [];
  const cleanupCandidates: BackupPlanItem[] = [];

  let snapshotIndex = 0;

  for (const item of plan.items) {
    if (item.action === "skip") {
      results.push({
        id: item.id,
        name: item.name,
        action: item.action,
        status: "skipped",
        message: item.reason,
        skillId: item.targetSkillId,
        slug: item.targetSkillSlug,
        snapshotPath: null,
      });
      continue;
    }

    if (item.action === "update" && !item.targetSkillId) {
      results.push({
        id: item.id,
        name: item.name,
        action: item.action,
        status: "failed",
        message: "plan item is missing targetSkillId for update",
        skillId: null,
        slug: null,
        snapshotPath: null,
      });
      continue;
    }

    snapshotIndex += 1;
    const snapshotPath = join(
      snapshotDir,
      `${String(snapshotIndex).padStart(2, "0")}-${sanitizePathSegment(item.slug)}`,
    );

    try {
      await cp(item.canonicalPath, snapshotPath, { recursive: true, dereference: true });
    } catch (error) {
      results.push({
        id: item.id,
        name: item.name,
        action: item.action,
        status: "failed",
        message: `failed to create snapshot: ${readErrorMessage(error)}`,
        skillId: null,
        slug: null,
        snapshotPath,
      });
      continue;
    }

    try {
      if (item.action === "create") {
        const { createdSkill, slugUsed } = await createSkillFromFolder(snapshotPath, item.slug);
        cleanupCandidates.push(item);

        results.push({
          id: item.id,
          name: item.name,
          action: item.action,
          status: "created",
          message: slugUsed === item.slug ? "created" : `created with adjusted slug ${slugUsed}`,
          skillId: createdSkill.id,
          slug: createdSkill.slug,
          snapshotPath,
        });

        continue;
      }

      const updatedSkill = await updateSkillFromFolder(item.targetSkillId!, snapshotPath);
      cleanupCandidates.push(item);

      results.push({
        id: item.id,
        name: item.name,
        action: item.action,
        status: "updated",
        message: "updated",
        skillId: updatedSkill.id,
        slug: updatedSkill.slug,
        snapshotPath,
      });
    } catch (error) {
      results.push({
        id: item.id,
        name: item.name,
        action: item.action,
        status: "failed",
        message: readErrorMessage(error),
        skillId: null,
        slug: null,
        snapshotPath,
      });
    }
  }

  const removedLocalFolders: string[] = [];
  const cleanupWarnings: string[] = [];
  const removedSet = new Set<string>();

  for (const item of cleanupCandidates) {
    for (const occurrence of item.occurrences) {
      if (!occurrence.cleanupEligible || removedSet.has(occurrence.path)) {
        continue;
      }

      if (!isSafeCleanupPath(occurrence)) {
        cleanupWarnings.push(`skipped unsafe cleanup path: ${occurrence.path}`);
        continue;
      }

      const skillFile = await stat(join(occurrence.path, "SKILL.md")).catch(() => null);
      if (!skillFile?.isFile()) {
        continue;
      }

      const installMetadata = await readFile(
        join(occurrence.path, INSTALL_METADATA_FILE),
        "utf8",
      ).catch(() => null);
      if (installMetadata) {
        continue;
      }

      try {
        await rm(occurrence.path, { recursive: true, force: true });
        removedSet.add(occurrence.path);
        removedLocalFolders.push(occurrence.path);
      } catch (error) {
        cleanupWarnings.push(`${occurrence.path}: ${readErrorMessage(error)}`);
      }
    }
  }

  const createdCount = results.filter((result) => result.status === "created").length;
  const updatedCount = results.filter((result) => result.status === "updated").length;
  const skippedCount = results.filter((result) => result.status === "skipped").length;
  const failedCount = results.filter((result) => result.status === "failed").length;

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    snapshotDir,
    createdCount,
    updatedCount,
    skippedCount,
    failedCount,
    removedLocalFolders,
    cleanupWarnings,
    results,
  };
}
