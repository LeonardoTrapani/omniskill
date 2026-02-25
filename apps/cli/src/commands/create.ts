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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  let from: string | undefined;
  let slug: string | undefined;
  let isPublic = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--public") {
      isPublic = true;
    } else if (arg === "--from" && args[i + 1]) {
      from = args[++i];
    } else if (arg === "--slug" && args[i + 1]) {
      slug = args[++i];
    }
  }

  return { from, slug, isPublic };
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

export async function createCommand() {
  const { from, slug: slugOverride, isPublic } = parseArgs(process.argv);

  if (!from) {
    p.log.error("usage: better-skills create --from <dir> [--slug <s>] [--public]");
    process.exit(1);
  }

  // validate directory exists and has SKILL.md
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

  const slug =
    slugOverride ||
    (typeof frontmatter.slug === "string" ? frontmatter.slug : null) ||
    slugify(name);
  const visibility = isPublic ? ("public" as const) : ("private" as const);

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

  const markdownForCreate =
    newResourcePaths.length > 0
      ? stripNewResourceMentionsForCreate(originalMarkdown)
      : originalMarkdown;

  s.start("creating skill");

  let createdSkill: Awaited<ReturnType<typeof trpc.skills.create.mutate>> | null = null;

  try {
    createdSkill = await trpc.skills.create.mutate({
      slug,
      name,
      description,
      skillMarkdown: markdownForCreate,
      visibility,
      frontmatter: frontmatter as Record<string, unknown>,
      resources,
    });

    if (newResourcePaths.length > 0) {
      s.message("resolving local new resource mentions");

      const resourceIdByPath = new Map(
        createdSkill.resources.map((resource) => [
          normalizeResourcePath(resource.path),
          resource.id,
        ]),
      );

      const resolved = resolveNewResourceMentionsToUuids(originalMarkdown, resourceIdByPath);

      if (resolved.missingPaths.length > 0) {
        throw new Error(
          [
            "failed to resolve new resource mention path(s) after create:",
            ...resolved.missingPaths.map((path) => `  - ${path}`),
          ].join("\n"),
        );
      }

      if (resolved.markdown !== markdownForCreate) {
        createdSkill = await trpc.skills.update.mutate({
          id: createdSkill.id,
          skillMarkdown: resolved.markdown,
        });
      }
    }

    s.stop(pc.green("skill created"));

    // structured output for agents
    console.log(
      JSON.stringify({
        id: createdSkill.id,
        slug: createdSkill.slug,
        name: createdSkill.name,
        visibility: createdSkill.visibility,
      }),
    );
  } catch (error) {
    s.stop(pc.red("creation failed"));

    if (createdSkill) {
      p.log.error(`skill was created but finalization failed: ${createdSkill.id}`);
    }

    p.log.error(readErrorMessage(error));
    process.exit(1);
  }
}
