import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { and, eq, inArray, sql } from "drizzle-orm";
import matter from "gray-matter";

import { db } from "@better-skills/db";
import { skill, skillLink, skillResource } from "@better-skills/db/schema/skills";
import {
  collectNewResourceMentionPaths,
  normalizeResourcePath,
  resolveNewResourceMentionsToUuids,
} from "@better-skills/markdown/new-resource-mentions";
import { parseMentions } from "@better-skills/markdown/persisted-mentions";

type ResourceKind = (typeof skillResource.$inferInsert)["kind"];
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AutoLinkSource =
  | {
      type: "skill";
      sourceId: string;
      markdown: string;
    }
  | {
      type: "resource";
      sourceId: string;
      markdown: string;
    };

interface SkillTemplateResource {
  path: string;
  kind: ResourceKind;
  content: string;
}

interface SkillTemplate {
  slug: string;
  name: string;
  description: string;
  markdown: string;
  frontmatter: Record<string, unknown>;
  resources: SkillTemplateResource[];
}

interface SeedDefaultSkillsResult {
  created: number;
  skipped: number;
  failed: number;
}

interface SyncDefaultSkillsResult {
  templates: number;
  matched: number;
  updated: number;
  skipped: number;
  failed: number;
}

interface ResolvedTemplateMentions {
  skillMarkdown: string;
  resourceContentByPath: Map<string, string>;
}

const DEFAULT_TEMPLATE_VERSION_KEY = "defaultTemplateVersion";

const DEFAULT_SKILLS_DIR_CANDIDATES = [
  join(dirname(fileURLToPath(import.meta.url)), "../../../resources/default-skills"),
  join(process.cwd(), "resources/default-skills"),
];

const RESOURCE_KIND_BY_DIR: Record<string, ResourceKind> = {
  references: "reference",
  scripts: "script",
  assets: "asset",
};

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".eot",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".bz2",
  ".mp3",
  ".mp4",
  ".wav",
  ".ogg",
  ".webm",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".db",
  ".sqlite",
]);

const NEW_MENTION_MARKDOWN_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);

async function syncMarkdownAutoLinksForSources(
  tx: DbTx,
  sources: AutoLinkSource[],
  createdByUserId: string | null,
): Promise<void> {
  if (sources.length === 0) {
    return;
  }

  const dedupedSources = new Map<string, AutoLinkSource>();

  for (const source of sources) {
    const sourceId = source.sourceId.toLowerCase();

    dedupedSources.set(`${source.type}:${sourceId}`, {
      ...source,
      sourceId,
    });
  }

  for (const source of dedupedSources.values()) {
    const sourceCondition =
      source.type === "skill"
        ? eq(skillLink.sourceSkillId, source.sourceId)
        : eq(skillLink.sourceResourceId, source.sourceId);

    await tx
      .delete(skillLink)
      .where(and(sourceCondition, sql`${skillLink.metadata}->>'origin' = 'markdown-auto'`));

    const mentions = parseMentions(source.markdown);

    if (mentions.length === 0) {
      continue;
    }

    await tx.insert(skillLink).values(
      mentions.map((mention) => ({
        sourceSkillId: source.type === "skill" ? source.sourceId : null,
        sourceResourceId: source.type === "resource" ? source.sourceId : null,
        targetSkillId: mention.type === "skill" ? mention.targetId : null,
        targetResourceId: mention.type === "resource" ? mention.targetId : null,
        kind: "mention",
        metadata: { origin: "markdown-auto" } as Record<string, unknown>,
        createdByUserId,
      })),
    );
  }
}

async function resyncMarkdownAutoLinksForSkill(
  tx: DbTx,
  sourceSkillId: string,
  sourceOwnerUserId: string | null,
): Promise<void> {
  const sourceSkillRows = await tx
    .select({ id: skill.id, skillMarkdown: skill.skillMarkdown })
    .from(skill)
    .where(eq(skill.id, sourceSkillId))
    .limit(1);

  const sourceSkill = sourceSkillRows[0];

  if (!sourceSkill) {
    return;
  }

  const sourceResources = await tx
    .select({ id: skillResource.id, path: skillResource.path, content: skillResource.content })
    .from(skillResource)
    .where(eq(skillResource.skillId, sourceSkill.id));

  const resourceIdByPath = new Map(
    sourceResources.map((sourceResource) => [
      normalizeResourcePath(sourceResource.path),
      sourceResource.id,
    ]),
  );

  const resolvedSkillMentions = resolveNewResourceMentionsToUuids(
    sourceSkill.skillMarkdown,
    resourceIdByPath,
  );

  if (resolvedSkillMentions.markdown !== sourceSkill.skillMarkdown) {
    await tx
      .update(skill)
      .set({ skillMarkdown: resolvedSkillMentions.markdown, updatedAt: new Date() })
      .where(eq(skill.id, sourceSkill.id));
  }

  const linkSyncSources: AutoLinkSource[] = [
    {
      type: "skill",
      sourceId: sourceSkill.id,
      markdown: resolvedSkillMentions.markdown,
    },
  ];

  for (const sourceResource of sourceResources) {
    if (!shouldResolveNewMentionsInResource(sourceResource.path)) {
      linkSyncSources.push({
        type: "resource",
        sourceId: sourceResource.id,
        markdown: sourceResource.content,
      });
      continue;
    }

    const resolvedResourceMentions = resolveNewResourceMentionsToUuids(
      sourceResource.content,
      resourceIdByPath,
    );

    if (resolvedResourceMentions.markdown !== sourceResource.content) {
      await tx
        .update(skillResource)
        .set({ content: resolvedResourceMentions.markdown })
        .where(eq(skillResource.id, sourceResource.id));
    }

    linkSyncSources.push({
      type: "resource",
      sourceId: sourceResource.id,
      markdown: resolvedResourceMentions.markdown,
    });
  }

  await syncMarkdownAutoLinksForSources(tx, linkSyncSources, sourceOwnerUserId);
}

function withDefaultTemplateVersion(
  metadata: Record<string, unknown>,
  templateVersion: string,
): Record<string, unknown> {
  return {
    ...metadata,
    [DEFAULT_TEMPLATE_VERSION_KEY]: templateVersion,
  };
}

function getDefaultTemplateVersion(metadata: Record<string, unknown>): string | null {
  const value = metadata[DEFAULT_TEMPLATE_VERSION_KEY];
  return typeof value === "string" ? value : null;
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}

function buildTemplateVersion(template: SkillTemplate): string {
  const stableResourceIdByPath = new Map<string, string>();
  for (const resource of template.resources) {
    const normalizedPath = normalizeResourcePath(resource.path);
    if (!stableResourceIdByPath.has(normalizedPath)) {
      stableResourceIdByPath.set(normalizedPath, `path:${normalizedPath}`);
    }
  }

  const resolvedTemplateMentions = resolveTemplateMentions(template, stableResourceIdByPath);

  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      slug: template.slug,
      name: template.name,
      description: template.description,
      markdown: resolvedTemplateMentions.skillMarkdown,
      frontmatter: template.frontmatter,
      resources: template.resources
        .map((resource) => ({
          path: normalizeResourcePath(resource.path),
          kind: resource.kind,
          content:
            resolvedTemplateMentions.resourceContentByPath.get(
              normalizeResourcePath(resource.path),
            ) ?? resource.content,
        }))
        .toSorted((a, b) => a.path.localeCompare(b.path)),
    }),
  );

  return hash.digest("hex");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveDefaultSkillsDir(): Promise<string | null> {
  for (const candidate of DEFAULT_SKILLS_DIR_CANDIDATES) {
    try {
      const info = await stat(candidate);
      if (info.isDirectory()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function isBinaryPath(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function classifyResource(path: string): ResourceKind {
  const firstDir = path.split("/")[0];
  if (firstDir && firstDir in RESOURCE_KIND_BY_DIR) {
    return RESOURCE_KIND_BY_DIR[firstDir];
  }

  const ext = extname(path).toLowerCase();
  if ([".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".sh", ".bash", ".zsh"].includes(ext)) {
    return "script";
  }
  if ([".md", ".mdx", ".txt"].includes(ext)) {
    return "reference";
  }
  return "other";
}

function shouldResolveNewMentionsInResource(path: string): boolean {
  return NEW_MENTION_MARKDOWN_EXTENSIONS.has(extname(path).toLowerCase());
}

async function scanSkillResources(skillDir: string): Promise<SkillTemplateResource[]> {
  async function walk(currentDir: string): Promise<SkillTemplateResource[]> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    const sorted = entries.toSorted((a, b) => a.name.localeCompare(b.name));
    const resources: SkillTemplateResource[] = [];

    for (const entry of sorted) {
      const fullPath = join(currentDir, entry.name);
      const relPath = relative(skillDir, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (await pathExists(join(fullPath, "SKILL.md"))) {
          continue;
        }
        resources.push(...(await walk(fullPath)));
        continue;
      }

      if (!entry.isFile() || entry.name === "SKILL.md") {
        continue;
      }

      if (isBinaryPath(entry.name)) {
        continue;
      }

      const content = await readFile(fullPath, "utf8");
      resources.push({
        path: relPath,
        kind: classifyResource(relPath),
        content,
      });
    }

    return resources;
  }

  return walk(skillDir);
}

function collectTemplateMentionPaths(template: SkillTemplate): string[] {
  const seen = new Set<string>();
  const mentionedPaths: string[] = [];

  const collectFromMarkdown = (markdown: string) => {
    for (const mentionedPath of collectNewResourceMentionPaths(markdown)) {
      if (!seen.has(mentionedPath)) {
        seen.add(mentionedPath);
        mentionedPaths.push(mentionedPath);
      }
    }
  };

  collectFromMarkdown(template.markdown);
  for (const resource of template.resources) {
    if (!shouldResolveNewMentionsInResource(resource.path)) {
      continue;
    }

    collectFromMarkdown(resource.content);
  }

  return mentionedPaths;
}

function resolveTemplateMentions(
  template: SkillTemplate,
  resourceIdByPath: ReadonlyMap<string, string>,
): ResolvedTemplateMentions {
  const missingPaths = new Set<string>();

  const resolvedSkillMentions = resolveNewResourceMentionsToUuids(
    template.markdown,
    resourceIdByPath,
  );
  for (const missingPath of resolvedSkillMentions.missingPaths) {
    missingPaths.add(missingPath);
  }

  const resourceContentByPath = new Map<string, string>();
  for (const resource of template.resources) {
    if (!shouldResolveNewMentionsInResource(resource.path)) {
      continue;
    }

    const normalizedPath = normalizeResourcePath(resource.path);
    const resolvedResourceMentions = resolveNewResourceMentionsToUuids(
      resource.content,
      resourceIdByPath,
    );

    for (const missingPath of resolvedResourceMentions.missingPaths) {
      missingPaths.add(missingPath);
    }

    if (resolvedResourceMentions.markdown !== resource.content) {
      resourceContentByPath.set(normalizedPath, resolvedResourceMentions.markdown);
    }
  }

  if (missingPaths.size > 0) {
    throw new Error(
      `default skill "${template.slug}" could not resolve :new: mentions: ${[...missingPaths]
        .toSorted((a, b) => a.localeCompare(b))
        .join(", ")}`,
    );
  }

  return {
    skillMarkdown: resolvedSkillMentions.markdown,
    resourceContentByPath,
  };
}

function assertTemplateMentionPathsExist(template: SkillTemplate): void {
  const mentionedPaths = collectTemplateMentionPaths(template);

  if (mentionedPaths.length === 0) {
    return;
  }

  const resourcePaths = new Set(
    template.resources.map((resource) => normalizeResourcePath(resource.path)),
  );
  const missingPaths = mentionedPaths.filter((path) => !resourcePaths.has(path));

  if (missingPaths.length > 0) {
    throw new Error(
      `default skill "${template.slug}" references missing local resources: ${missingPaths.join(", ")}`,
    );
  }
}

async function loadDefaultSkillTemplates(): Promise<SkillTemplate[]> {
  const baseDir = await resolveDefaultSkillsDir();
  if (!baseDir) {
    return [];
  }

  const entries = await readdir(baseDir, { withFileTypes: true });
  const templates: SkillTemplate[] = [];

  for (const entry of entries.toSorted((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = join(baseDir, entry.name);
    const skillMdPath = join(skillDir, "SKILL.md");

    if (!(await pathExists(skillMdPath))) {
      continue;
    }

    const rawSkill = await readFile(skillMdPath, "utf8");
    const { data, content } = matter(rawSkill);

    const slug = basename(skillDir);
    const name = typeof data.name === "string" && data.name.trim().length > 0 ? data.name : slug;
    const description = typeof data.description === "string" ? data.description : "";
    const markdown = content.trim();
    const resources = await scanSkillResources(skillDir);

    templates.push({
      slug,
      name,
      description,
      markdown,
      frontmatter: data as Record<string, unknown>,
      resources,
    });
  }

  return templates;
}

function extractSkillSourceData(frontmatter: Record<string, unknown>): {
  sourceUrl: string | null;
  sourceIdentifier: string | null;
} {
  const sourceUrl = typeof frontmatter.sourceUrl === "string" ? frontmatter.sourceUrl : null;
  const sourceIdentifier =
    typeof frontmatter.sourceIdentifier === "string" ? frontmatter.sourceIdentifier : null;

  return {
    sourceUrl,
    sourceIdentifier,
  };
}

export async function seedDefaultSkillsForUser(userId: string): Promise<SeedDefaultSkillsResult> {
  const templates = await loadDefaultSkillTemplates();
  if (templates.length === 0) {
    return { created: 0, skipped: 0, failed: 0 };
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const template of templates) {
    try {
      const [existing] = await db
        .select({ id: skill.id })
        .from(skill)
        .where(and(eq(skill.ownerUserId, userId), eq(skill.slug, template.slug)));

      if (existing) {
        skipped++;
        continue;
      }

      assertTemplateMentionPathsExist(template);
      const templateVersion = buildTemplateVersion(template);

      await db.transaction(async (tx) => {
        const { sourceIdentifier, sourceUrl } = extractSkillSourceData(template.frontmatter);

        const [createdSkill] = await tx
          .insert(skill)
          .values({
            ownerUserId: userId,
            slug: template.slug,
            name: template.name,
            description: template.description,
            skillMarkdown: template.markdown,
            frontmatter: template.frontmatter,
            metadata: withDefaultTemplateVersion({}, templateVersion),
            isDefault: true,
            sourceUrl,
            sourceIdentifier,
          })
          .returning({ id: skill.id });

        if (!createdSkill) {
          throw new Error(`failed to insert default skill "${template.slug}"`);
        }

        const insertedResources =
          template.resources.length > 0
            ? await tx
                .insert(skillResource)
                .values(
                  template.resources.map((resource) => ({
                    skillId: createdSkill.id,
                    path: resource.path,
                    kind: resource.kind,
                    content: resource.content,
                    metadata: {},
                  })),
                )
                .returning({ id: skillResource.id, path: skillResource.path })
            : [];

        const resourceIdByPath = new Map(
          insertedResources.map((resource) => [normalizeResourcePath(resource.path), resource.id]),
        );

        const resolvedMentions = resolveTemplateMentions(template, resourceIdByPath);

        for (const insertedResource of insertedResources) {
          const resolvedResourceMarkdown = resolvedMentions.resourceContentByPath.get(
            normalizeResourcePath(insertedResource.path),
          );

          if (!resolvedResourceMarkdown) {
            continue;
          }

          await tx
            .update(skillResource)
            .set({ content: resolvedResourceMarkdown })
            .where(eq(skillResource.id, insertedResource.id));
        }

        if (resolvedMentions.skillMarkdown !== template.markdown) {
          await tx
            .update(skill)
            .set({ skillMarkdown: resolvedMentions.skillMarkdown, updatedAt: new Date() })
            .where(eq(skill.id, createdSkill.id));
        }

        await resyncMarkdownAutoLinksForSkill(tx, createdSkill.id, userId);
      });

      created++;
    } catch (error) {
      failed++;
      console.error(`[default-skills] failed seeding "${template.slug}" for user ${userId}`, error);
    }
  }

  return { created, skipped, failed };
}

async function syncExistingDefaultSkill(
  existingSkill: {
    id: string;
    ownerUserId: string | null;
    metadata: Record<string, unknown>;
  },
  template: SkillTemplate,
  templateVersion: string,
): Promise<"updated" | "skipped"> {
  if (getDefaultTemplateVersion(existingSkill.metadata) === templateVersion) {
    await db.transaction(async (tx) => {
      await resyncMarkdownAutoLinksForSkill(tx, existingSkill.id, existingSkill.ownerUserId);
    });

    return "skipped";
  }

  await db.transaction(async (tx) => {
    const { sourceIdentifier, sourceUrl } = extractSkillSourceData(template.frontmatter);

    const existingResources = await tx
      .select({ id: skillResource.id, path: skillResource.path })
      .from(skillResource)
      .where(eq(skillResource.skillId, existingSkill.id));

    const existingResourceByPath = new Map(
      existingResources.map((resource) => [normalizeResourcePath(resource.path), resource]),
    );

    const templateResourceByPath = new Map<string, SkillTemplateResource>();
    for (const resource of template.resources) {
      const normalizedPath = normalizeResourcePath(resource.path);

      if (templateResourceByPath.has(normalizedPath)) {
        throw new Error(
          `default skill "${template.slug}" contains duplicate resource path "${normalizedPath}"`,
        );
      }

      templateResourceByPath.set(normalizedPath, resource);
    }

    const resourceIdsToDelete = existingResources
      .filter((resource) => !templateResourceByPath.has(normalizeResourcePath(resource.path)))
      .map((resource) => resource.id);

    if (resourceIdsToDelete.length > 0) {
      await tx.delete(skillResource).where(inArray(skillResource.id, resourceIdsToDelete));
    }

    const resourcesToInsert: Array<typeof skillResource.$inferInsert> = [];

    for (const [normalizedPath, templateResource] of templateResourceByPath) {
      const existingResource = existingResourceByPath.get(normalizedPath);

      if (existingResource) {
        await tx
          .update(skillResource)
          .set({
            path: templateResource.path,
            kind: templateResource.kind,
            content: templateResource.content,
            metadata: {},
          })
          .where(eq(skillResource.id, existingResource.id));
        continue;
      }

      resourcesToInsert.push({
        skillId: existingSkill.id,
        path: templateResource.path,
        kind: templateResource.kind,
        content: templateResource.content,
        metadata: {},
      });
    }

    if (resourcesToInsert.length > 0) {
      await tx.insert(skillResource).values(resourcesToInsert);
    }

    const finalResources = await tx
      .select({ id: skillResource.id, path: skillResource.path })
      .from(skillResource)
      .where(eq(skillResource.skillId, existingSkill.id));

    const resourceIdByPath = new Map(
      finalResources.map((resource) => [normalizeResourcePath(resource.path), resource.id]),
    );

    const resolvedMentions = resolveTemplateMentions(template, resourceIdByPath);

    for (const resource of finalResources) {
      const resolvedResourceMarkdown = resolvedMentions.resourceContentByPath.get(
        normalizeResourcePath(resource.path),
      );

      if (!resolvedResourceMarkdown) {
        continue;
      }

      await tx
        .update(skillResource)
        .set({ content: resolvedResourceMarkdown })
        .where(eq(skillResource.id, resource.id));
    }

    await tx
      .update(skill)
      .set({
        name: template.name,
        description: template.description,
        skillMarkdown: resolvedMentions.skillMarkdown,
        frontmatter: template.frontmatter,
        metadata: withDefaultTemplateVersion(existingSkill.metadata, templateVersion),
        sourceUrl,
        sourceIdentifier,
        updatedAt: new Date(),
      })
      .where(eq(skill.id, existingSkill.id));

    await resyncMarkdownAutoLinksForSkill(tx, existingSkill.id, existingSkill.ownerUserId);
  });

  return "updated";
}

export async function syncDefaultSkillsForAllUsers(): Promise<SyncDefaultSkillsResult> {
  const templates = await loadDefaultSkillTemplates();
  if (templates.length === 0) {
    return {
      templates: 0,
      matched: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };
  }

  let matched = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const template of templates) {
    try {
      assertTemplateMentionPathsExist(template);
      const templateVersion = buildTemplateVersion(template);

      const existingDefaultSkills = await db
        .select({
          id: skill.id,
          slug: skill.slug,
          ownerUserId: skill.ownerUserId,
          metadata: skill.metadata,
        })
        .from(skill)
        .where(and(eq(skill.slug, template.slug), eq(skill.isDefault, true)));

      matched += existingDefaultSkills.length;

      for (const existingSkill of existingDefaultSkills) {
        try {
          const outcome = await syncExistingDefaultSkill(
            {
              id: existingSkill.id,
              ownerUserId: existingSkill.ownerUserId,
              metadata: normalizeMetadata(existingSkill.metadata),
            },
            template,
            templateVersion,
          );

          if (outcome === "updated") {
            updated++;
          } else {
            skipped++;
          }
        } catch (error) {
          failed++;
          console.error(
            `[default-skills] failed syncing "${template.slug}" for skill ${existingSkill.id} (owner ${existingSkill.ownerUserId ?? "null"})`,
            error,
          );
        }
      }
    } catch (error) {
      failed++;
      console.error(`[default-skills] failed preparing sync for "${template.slug}"`, error);
    }
  }

  return {
    templates: templates.length,
    matched,
    updated,
    skipped,
    failed,
  };
}
