import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import * as p from "@clack/prompts";
import matter from "gray-matter";
import pc from "picocolors";

import { trpc } from "../lib/trpc";

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
    p.log.error("usage: omniscient create --from <dir> [--slug <s>] [--public]");
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

  s.start("creating skill");

  try {
    const created = await trpc.skills.create.mutate({
      slug,
      name,
      description,
      skillMarkdown: markdownBody.trim(),
      visibility,
      frontmatter: frontmatter as Record<string, unknown>,
      resources,
    });

    s.stop(pc.green("skill created"));

    // structured output for agents
    console.log(
      JSON.stringify({
        id: created.id,
        slug: created.slug,
        name: created.name,
        visibility: created.visibility,
      }),
    );
  } catch (error) {
    s.stop(pc.red("creation failed"));
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(message);
    process.exit(1);
  }
}
