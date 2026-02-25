import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { and, eq } from "drizzle-orm";
import matter from "gray-matter";

import { db } from "@better-skills/db";
import { skill, skillResource } from "@better-skills/db/schema/skills";

type ResourceKind = (typeof skillResource.$inferInsert)["kind"];

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

const NEW_RESOURCE_MENTION_RE = new RegExp(
  String.raw`(?<!\\)\[\[(skill|resource):new:([^\]\n]+)\]\]`,
  "gi",
);

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

function replaceOutsideMarkdownCode(
  markdown: string,
  replacer: (match: string, type: string, resourcePath: string) => string,
): string {
  const lines = markdown.split("\n");
  const mentionPattern = new RegExp(NEW_RESOURCE_MENTION_RE.source, "gi");

  let inFence = false;
  let fenceMarker: "`" | "~" | null = null;

  const transformed = lines.map((line) => {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);

    if (fenceMatch) {
      const marker = fenceMatch[1]![0] as "`" | "~";

      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
        return line;
      }

      if (fenceMarker === marker) {
        inFence = false;
        fenceMarker = null;
      }

      return line;
    }

    if (inFence) {
      return line;
    }

    const parts = line.split(/(`[^`]*`)/g);
    return parts
      .map((part) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return part;
        }

        return part.replace(mentionPattern, replacer);
      })
      .join("");
  });

  return transformed.join("\n");
}

function normalizeResourcePath(path: string): string {
  let normalized = path.trim();

  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }

  normalized = normalized.replace(/\\/g, "/");

  const hashIndex = normalized.indexOf("#");
  if (hashIndex >= 0) {
    normalized = normalized.slice(0, hashIndex);
  }

  const queryIndex = normalized.indexOf("?");
  if (queryIndex >= 0) {
    normalized = normalized.slice(0, queryIndex);
  }

  while (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }

  return normalized;
}

function collectNewResourceMentionPaths(markdown: string): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];

  replaceOutsideMarkdownCode(markdown, (_match, _type, resourcePath) => {
    const normalizedPath = normalizeResourcePath(resourcePath);
    if (!seen.has(normalizedPath)) {
      seen.add(normalizedPath);
      paths.push(normalizedPath);
    }
    return _match;
  });

  return paths;
}

function resolveNewResourceMentionsToUuids(
  markdown: string,
  resourceIdByPath: ReadonlyMap<string, string>,
): { markdown: string; missingPaths: string[] } {
  const missing = new Set<string>();

  const resolvedMarkdown = replaceOutsideMarkdownCode(markdown, (match, _type, resourcePath) => {
    const normalizedPath = normalizeResourcePath(resourcePath);
    const resourceId = resourceIdByPath.get(normalizedPath);

    if (!resourceId) {
      missing.add(normalizedPath);
      return match;
    }

    return `[[resource:${resourceId.toLowerCase()}]]`;
  });

  return {
    markdown: resolvedMarkdown,
    missingPaths: [...missing],
  };
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

      const mentionedPaths = collectNewResourceMentionPaths(template.markdown);
      const resourcePaths = new Set(
        template.resources.map((resource) => normalizeResourcePath(resource.path)),
      );
      const missingPaths = mentionedPaths.filter((path) => !resourcePaths.has(path));

      if (missingPaths.length > 0) {
        throw new Error(
          `default skill "${template.slug}" references missing local resources: ${missingPaths.join(", ")}`,
        );
      }

      await db.transaction(async (tx) => {
        const { sourceIdentifier, sourceUrl } = extractSkillSourceData(template.frontmatter);

        const [createdSkill] = await tx
          .insert(skill)
          .values({
            ownerUserId: userId,
            visibility: "private",
            slug: template.slug,
            name: template.name,
            description: template.description,
            skillMarkdown: template.markdown,
            frontmatter: template.frontmatter,
            metadata: {},
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

        const resolvedMentions = resolveNewResourceMentionsToUuids(
          template.markdown,
          resourceIdByPath,
        );

        if (resolvedMentions.missingPaths.length > 0) {
          throw new Error(
            `default skill "${template.slug}" could not resolve :new: mentions: ${resolvedMentions.missingPaths.join(
              ", ",
            )}`,
          );
        }

        if (resolvedMentions.markdown !== template.markdown) {
          await tx
            .update(skill)
            .set({ skillMarkdown: resolvedMentions.markdown, updatedAt: new Date() })
            .where(eq(skill.id, createdSkill.id));
        }
      });

      created++;
    } catch (error) {
      failed++;
      console.error(`[default-skills] failed seeding "${template.slug}" for user ${userId}`, error);
    }
  }

  return { created, skipped, failed };
}
