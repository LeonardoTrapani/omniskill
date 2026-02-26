import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import matter from "gray-matter";

import {
  collectNewResourceMentionPaths,
  normalizeResourcePath,
  resolveNewResourceMentionsToUuids,
  stripNewResourceMentionsForCreate,
} from "./new-resource-mentions";
import { trpc } from "./trpc";

export { readErrorMessage } from "./errors";

const RESOURCE_DIRS: Record<string, "reference" | "script" | "asset"> = {
  references: "reference",
  scripts: "script",
  assets: "asset",
};

export type ResourceInput = {
  path: string;
  kind: "reference" | "script" | "asset" | "other";
  content: string;
  metadata: Record<string, unknown>;
};

export type LocalSkillDraft = {
  name: string;
  description: string;
  markdown: string;
  frontmatter: Record<string, unknown>;
  resources: ResourceInput[];
  newResourcePaths: string[];
  /** markdown with [[resource:new:...]] mentions stripped (safe to send on first mutation) */
  markdownForMutation: string;
};

export type UpdateResourcePayload = {
  id?: string;
  delete?: boolean;
  path: string;
  kind: "reference" | "script" | "asset" | "other";
  content: string;
  metadata: Record<string, unknown>;
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function scanResources(baseDir: string): Promise<ResourceInput[]> {
  const resources: ResourceInput[] = [];

  for (const [dirName, kind] of Object.entries(RESOURCE_DIRS)) {
    const dirPath = join(baseDir, dirName);

    try {
      const dirStat = await stat(dirPath);
      if (!dirStat.isDirectory()) continue;
    } catch {
      continue;
    }

    const entries = await readdir(dirPath, { recursive: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const fileStat = await stat(fullPath);
      if (!fileStat.isFile()) continue;

      const content = await readFile(fullPath, "utf8");
      const relativePath = join(dirName, relative(dirPath, fullPath));

      resources.push({ path: relativePath, kind, content, metadata: {} });
    }
  }

  return resources;
}

/**
 * Read a local skill directory and return everything needed for create/update.
 * Throws with a user-facing message on validation failure.
 */
export async function loadLocalSkillDraft(from: string): Promise<LocalSkillDraft> {
  const dirStat = await stat(from).catch(() => null);

  if (!dirStat?.isDirectory()) {
    throw new Error(dirStat ? `not a directory: ${from}` : `directory not found: ${from}`);
  }

  const skillMdPath = join(from, "SKILL.md");
  let rawContent: string;

  try {
    rawContent = await readFile(skillMdPath, "utf8");
  } catch {
    throw new Error(`SKILL.md not found in ${from}`);
  }

  const { data: frontmatter, content: markdownBody } = matter(rawContent);

  const name = typeof frontmatter.name === "string" ? frontmatter.name : undefined;
  const description =
    typeof frontmatter.description === "string" ? frontmatter.description : undefined;

  if (!name) throw new Error("frontmatter missing required field: name");
  if (!description) throw new Error("frontmatter missing required field: description");

  const resources = await scanResources(from);
  const markdown = markdownBody.trim();
  const newResourcePaths = collectNewResourceMentionPaths(markdown);

  if (newResourcePaths.length > 0) {
    const localPaths = new Set(resources.map((r) => normalizeResourcePath(r.path)));
    const missing = newResourcePaths.filter((p) => !localPaths.has(p));

    if (missing.length > 0) {
      throw new Error(
        [
          "new resource mention path(s) not found in local folder:",
          ...missing.map((p) => `  - ${p}`),
        ].join("\n"),
      );
    }
  }

  const markdownForMutation =
    newResourcePaths.length > 0 ? stripNewResourceMentionsForCreate(markdown) : markdown;

  return {
    name,
    description,
    markdown,
    frontmatter: frontmatter as Record<string, unknown>,
    resources,
    newResourcePaths,
    markdownForMutation,
  };
}

/**
 * After the first create/update call, resolve [[resource:new:...]] mentions
 * to real UUIDs with a second update if needed.
 */
export async function resolveNewResourceMentions(
  skillId: string,
  draft: LocalSkillDraft,
  serverResources: { id: string; path: string }[],
): Promise<Awaited<ReturnType<typeof trpc.skills.update.mutate>> | null> {
  if (draft.newResourcePaths.length === 0) return null;

  const resourceIdByPath = new Map(
    serverResources.map((r) => [normalizeResourcePath(r.path), r.id]),
  );

  const resolved = resolveNewResourceMentionsToUuids(draft.markdown, resourceIdByPath);

  if (resolved.missingPaths.length > 0) {
    throw new Error(
      [
        "failed to resolve new resource mention path(s):",
        ...resolved.missingPaths.map((p) => `  - ${p}`),
      ].join("\n"),
    );
  }

  if (resolved.markdown === draft.markdownForMutation) return null;

  return await trpc.skills.update.mutate({
    id: skillId,
    skillMarkdown: resolved.markdown,
  });
}

/**
 * Diff local resources against existing server resources to produce the
 * resource mutation payload for `trpc.skills.update`.
 */
export function buildUpdateResourcesPayload(
  existingResources: {
    id: string;
    path: string;
    kind: string;
    content: string;
    metadata: Record<string, unknown>;
  }[],
  localResources: ResourceInput[],
): UpdateResourcePayload[] {
  const existingByPath = new Map(existingResources.map((r) => [normalizeResourcePath(r.path), r]));
  const localByPath = new Map(localResources.map((r) => [normalizeResourcePath(r.path), r]));

  const payload: UpdateResourcePayload[] = [];

  // existing resources not found locally -> delete
  for (const [path, existing] of existingByPath) {
    if (!localByPath.has(path)) {
      payload.push({
        id: existing.id,
        delete: true,
        path: existing.path,
        kind: existing.kind as ResourceInput["kind"],
        content: existing.content,
        metadata: existing.metadata,
      });
    }
  }

  // local resources: update existing or insert new
  for (const [path, local] of localByPath) {
    const existing = existingByPath.get(path);
    payload.push({
      ...(existing ? { id: existing.id } : {}),
      path: local.path,
      kind: local.kind,
      content: local.content,
      metadata: local.metadata,
    });
  }

  return payload;
}
