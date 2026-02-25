import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import * as p from "@clack/prompts";
import matter from "gray-matter";
import pc from "picocolors";

import { trpc } from "../lib/trpc";
import {
  collectNewResourceMentionPaths,
  normalizeResourcePath,
  resolveNewResourceMentionsToUuids,
  stripNewResourceMentionsForCreate,
} from "../lib/new-resource-mentions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RESOURCE_DIRS: Record<string, "reference" | "script" | "asset"> = {
  references: "reference",
  scripts: "script",
  assets: "asset",
};

type ResourceInput = {
  path: string;
  kind: "reference" | "script" | "asset" | "other";
  content: string;
  metadata: Record<string, unknown>;
};

function readErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: string;
      shape?: {
        message?: string;
      };
    };

    if (typeof candidate.shape?.message === "string") {
      return candidate.shape.message;
    }

    if (typeof candidate.message === "string") {
      return candidate.message;
    }
  }

  return String(error);
}

function parseArgs(argv: string[]) {
  const args = argv.slice(3);
  let identifier: string | undefined;
  let from: string | undefined;
  let slug: string | undefined;
  let visibility: "public" | "private" | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (!arg.startsWith("--") && !identifier) {
      identifier = arg;
      continue;
    }

    if (arg === "--from" && args[i + 1]) {
      from = args[++i];
      continue;
    }

    if (arg === "--slug" && args[i + 1]) {
      slug = args[++i];
      continue;
    }

    if (arg === "--public") {
      visibility = "public";
      continue;
    }

    if (arg === "--private") {
      visibility = "private";
      continue;
    }
  }

  return { identifier, from, slug, visibility };
}

async function scanResources(baseDir: string): Promise<ResourceInput[]> {
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

export async function updateCommand() {
  const { identifier, from, slug, visibility: visibilityOverride } = parseArgs(process.argv);

  if (!identifier || !from) {
    p.log.error(
      "usage: better-skills update <slug-or-uuid> --from <dir> [--slug <s>] [--public|--private]",
    );
    process.exit(1);
  }

  try {
    const dirStat = await stat(from);
    if (!dirStat.isDirectory()) {
      p.log.error(`not a directory: ${from}`);
      process.exit(1);
    }
  } catch {
    p.log.error(`directory not found: ${from}`);
    process.exit(1);
  }

  const skillMdPath = join(from, "SKILL.md");
  let rawContent: string;

  try {
    rawContent = await readFile(skillMdPath, "utf8");
  } catch {
    p.log.error(`SKILL.md not found in ${from}`);
    process.exit(1);
  }

  const { data: frontmatter, content: markdownBody } = matter(rawContent);

  const name = typeof frontmatter.name === "string" ? frontmatter.name : undefined;
  const description =
    typeof frontmatter.description === "string" ? frontmatter.description : undefined;

  if (!name) {
    p.log.error("frontmatter missing required field: name");
    process.exit(1);
  }

  if (!description) {
    p.log.error("frontmatter missing required field: description");
    process.exit(1);
  }

  const s = p.spinner();

  s.start("reading resources");
  const resources = await scanResources(from);
  s.stop(pc.dim(`found ${resources.length} resource(s)`));

  const originalMarkdown = markdownBody.trim();
  const newResourcePaths = collectNewResourceMentionPaths(originalMarkdown);

  if (newResourcePaths.length > 0) {
    const localResourcePaths = new Set(
      resources.map((resource) => normalizeResourcePath(resource.path)),
    );
    const missingResourcePaths = newResourcePaths.filter((path) => !localResourcePaths.has(path));

    if (missingResourcePaths.length > 0) {
      p.log.error(
        [
          "new resource mention path(s) not found in local folder:",
          ...missingResourcePaths.map((path) => `  - ${path}`),
        ].join("\n"),
      );
      process.exit(1);
    }
  }

  const markdownForUpdate =
    newResourcePaths.length > 0
      ? stripNewResourceMentionsForCreate(originalMarkdown)
      : originalMarkdown;

  s.start("loading skill");

  let targetSkill: Awaited<ReturnType<typeof trpc.skills.getById.query>>;
  try {
    targetSkill = UUID_RE.test(identifier)
      ? await trpc.skills.getById.query({ id: identifier, linkMentions: false })
      : await trpc.skills.getBySlug.query({ slug: identifier, linkMentions: false });
    s.stop(pc.dim(`loaded ${targetSkill.slug}`));
  } catch (error) {
    s.stop(pc.red("load failed"));
    p.log.error(readErrorMessage(error));
    process.exit(1);
  }

  const visibility = visibilityOverride ?? targetSkill.visibility;

  const existingResourceByPath = new Map(
    targetSkill.resources.map((resource) => [normalizeResourcePath(resource.path), resource]),
  );
  const localResourceByPath = new Map(
    resources.map((resource) => [normalizeResourcePath(resource.path), resource]),
  );

  const resourcesPayload: Array<{
    id?: string;
    delete?: boolean;
    path: string;
    kind: "reference" | "script" | "asset" | "other";
    content: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (const [path, existingResource] of existingResourceByPath) {
    if (!localResourceByPath.has(path)) {
      resourcesPayload.push({
        id: existingResource.id,
        delete: true,
        path: existingResource.path,
        kind: existingResource.kind,
        content: existingResource.content,
        metadata: existingResource.metadata,
      });
    }
  }

  for (const [path, localResource] of localResourceByPath) {
    const existingResource = existingResourceByPath.get(path);
    if (existingResource) {
      resourcesPayload.push({
        id: existingResource.id,
        path: localResource.path,
        kind: localResource.kind,
        content: localResource.content,
        metadata: localResource.metadata,
      });
      continue;
    }

    resourcesPayload.push({
      path: localResource.path,
      kind: localResource.kind,
      content: localResource.content,
      metadata: localResource.metadata,
    });
  }

  s.start("updating skill");

  let updatedSkill: Awaited<ReturnType<typeof trpc.skills.update.mutate>> | null = null;

  try {
    updatedSkill = await trpc.skills.update.mutate({
      id: targetSkill.id,
      slug,
      name,
      description,
      skillMarkdown: markdownForUpdate,
      visibility,
      frontmatter: frontmatter as Record<string, unknown>,
      resources: resourcesPayload,
    });

    if (newResourcePaths.length > 0) {
      s.message("resolving local new resource mentions");

      const resourceIdByPath = new Map(
        updatedSkill.resources.map((resource) => [
          normalizeResourcePath(resource.path),
          resource.id,
        ]),
      );

      const resolved = resolveNewResourceMentionsToUuids(originalMarkdown, resourceIdByPath);

      if (resolved.missingPaths.length > 0) {
        throw new Error(
          [
            "failed to resolve new resource mention path(s) after update:",
            ...resolved.missingPaths.map((path) => `  - ${path}`),
          ].join("\n"),
        );
      }

      if (resolved.markdown !== markdownForUpdate) {
        updatedSkill = await trpc.skills.update.mutate({
          id: updatedSkill.id,
          skillMarkdown: resolved.markdown,
        });
      }
    }

    s.stop(pc.green("skill updated"));

    console.log(
      JSON.stringify({
        id: updatedSkill.id,
        slug: updatedSkill.slug,
        name: updatedSkill.name,
        visibility: updatedSkill.visibility,
      }),
    );
  } catch (error) {
    s.stop(pc.red("update failed"));

    if (updatedSkill) {
      p.log.error(`skill was updated but finalization failed: ${updatedSkill.id}`);
    }

    p.log.error(readErrorMessage(error));
    process.exit(1);
  }
}
