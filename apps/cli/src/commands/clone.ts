import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseMentions } from "@better-skills/markdown/persisted-mentions";
import pc from "picocolors";

import { readErrorMessage } from "../lib/errors";
import { type InstallableSkill, writeSkillFolder } from "../lib/skills-installer";
import { trpc } from "../lib/trpc";
import * as ui from "../lib/ui";
import { UUID_RE } from "../lib/uuid";

type SkillDetails = Awaited<ReturnType<typeof trpc.skills.getById.query>>;
type SkillGraph = Awaited<ReturnType<typeof trpc.skills.graphForSkill.query>>;

type ContextRow = {
  uuid: string;
  type: "skill" | "resource";
  target: string;
};

function parseArgs(argv: string[]) {
  const args = argv.slice(3);
  let identifier: string | undefined;
  let to: string | undefined;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (!arg.startsWith("--") && !identifier) {
      identifier = arg;
      continue;
    }

    if (arg === "--to" && args[i + 1]) {
      to = args[++i];
      continue;
    }

    if (arg === "--force") {
      force = true;
      continue;
    }
  }

  return { identifier, to, force };
}

function toInstallableSkill(skill: SkillDetails): InstallableSkill {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    originalMarkdown: skill.originalMarkdown,
    renderedMarkdown: skill.renderedMarkdown,
    frontmatter: skill.frontmatter,
    resources: skill.resources.map((resource) => ({
      path: resource.path,
      content: resource.content,
    })),
    sourceUrl: skill.sourceUrl,
    sourceIdentifier: skill.sourceIdentifier,
  };
}

async function ensureTargetDir(path: string, force: boolean): Promise<void> {
  const current = await stat(path).catch(() => null);

  if (!current) {
    await mkdir(path, { recursive: true });
    return;
  }

  if (!current.isDirectory()) {
    throw new Error(`target exists and is not a directory: ${path}`);
  }

  const entries = await readdir(path);
  if (entries.length === 0) {
    return;
  }

  if (!force) {
    throw new Error(`target directory is not empty: ${path} (use --force to overwrite)`);
  }

  await rm(path, { recursive: true, force: true });
  await mkdir(path, { recursive: true });
}

function buildContextRows(
  mentions: ReturnType<typeof parseMentions>,
  skill: SkillDetails,
  graph: SkillGraph | null,
): ContextRow[] {
  const nodeById = new Map(graph?.nodes.map((node) => [node.id.toLowerCase(), node]) ?? []);
  const localResourceById = new Map(
    skill.resources.map((resource) => [resource.id.toLowerCase(), resource.path]),
  );
  const skillId = skill.id.toLowerCase();

  return mentions
    .map((mention) => {
      const uuid = mention.targetId.toLowerCase();

      if (mention.type === "skill") {
        if (uuid === skillId) {
          return { uuid, type: "skill" as const, target: skill.name };
        }

        const node = nodeById.get(uuid);
        if (node?.type === "skill") {
          return { uuid, type: "skill" as const, target: node.label };
        }

        return { uuid, type: "skill" as const, target: "(unknown skill)" };
      }

      const localPath = localResourceById.get(uuid);
      if (localPath) {
        return {
          uuid,
          type: "resource" as const,
          target: `${skill.name} / ${localPath}`,
        };
      }

      const node = nodeById.get(uuid);
      if (node?.type === "resource") {
        const parentSkill = node.parentSkillId
          ? nodeById.get(node.parentSkillId.toLowerCase())
          : null;
        const target =
          parentSkill?.type === "skill" ? `${parentSkill.label} / ${node.label}` : node.label;

        return {
          uuid,
          type: "resource" as const,
          target,
        };
      }

      return { uuid, type: "resource" as const, target: "(unknown resource)" };
    })
    .sort((a, b) => a.uuid.localeCompare(b.uuid));
}

function formatContextTable(rows: ContextRow[]): string {
  const uuidWidth = Math.max("uuid".length, ...rows.map((row) => row.uuid.length));
  const typeWidth = Math.max("type".length, ...rows.map((row) => row.type.length));
  const targetWidth = Math.max("target".length, ...rows.map((row) => row.target.length));

  const line = (uuid: string, type: string, target: string) => {
    return `| ${uuid.padEnd(uuidWidth)} | ${type.padEnd(typeWidth)} | ${target.padEnd(targetWidth)} |`;
  };

  const separator = `|-${"-".repeat(uuidWidth)}-|-${"-".repeat(typeWidth)}-|-${"-".repeat(targetWidth)}-|`;

  return [
    line("uuid", "type", "target"),
    separator,
    ...rows.map((row) => line(row.uuid, row.type, row.target)),
  ].join("\n");
}

export async function cloneCommand() {
  const { identifier, to, force } = parseArgs(process.argv);

  if (!identifier) {
    ui.log.error("usage: better-skills clone <slug-or-uuid> [--to <dir>] [--force]");
    process.exit(1);
  }

  const s = ui.spinner();
  s.start("loading skill");

  let skill: SkillDetails;
  try {
    skill = UUID_RE.test(identifier)
      ? await trpc.skills.getById.query({ id: identifier, linkMentions: false })
      : await trpc.skills.getBySlug.query({ slug: identifier, linkMentions: false });
    s.stop(pc.dim(`loaded ${skill.slug}`));
  } catch (error) {
    s.stop(pc.red("load failed"));
    ui.log.error(readErrorMessage(error));
    process.exit(1);
  }

  const targetDir = resolve(process.cwd(), to ?? skill.slug);

  s.start("preparing clone directory");
  try {
    await ensureTargetDir(targetDir, force);
    s.stop(pc.dim(`ready ${targetDir}`));
  } catch (error) {
    s.stop(pc.red("prepare failed"));
    ui.log.error(readErrorMessage(error));
    process.exit(1);
  }

  s.start("cloning skill locally");
  try {
    const result = await writeSkillFolder(toInstallableSkill(skill), targetDir, {
      markdownVariant: "original",
    });
    // write uuid→path map so validate can tell which [[resource:<uuid>]]
    // mentions are internal (this skill's own resources) vs external
    const resourceIds = Object.fromEntries(skill.resources.map((r) => [r.id, r.path]));
    await writeFile(resolve(targetDir, ".resource-ids.json"), JSON.stringify(resourceIds, null, 2));

    s.stop(pc.green(`cloned ${skill.slug}`));

    if (result.skippedResources.length > 0) {
      ui.log.warn(`skipped unsafe resource path(s): ${result.skippedResources.join(", ")}`);
    }
  } catch (error) {
    s.stop(pc.red("clone failed"));
    ui.log.error(readErrorMessage(error));
    process.exit(1);
  }

  const mentions = parseMentions(skill.originalMarkdown);

  if (mentions.length > 0) {
    s.start("building link context");

    let graph: SkillGraph | null = null;
    try {
      graph = await trpc.skills.graphForSkill.query({ skillId: skill.id });
      s.stop(pc.dim(`resolved ${mentions.length} link uuid(s)`));
    } catch (error) {
      s.stop(pc.dim(`could not resolve full link context: ${readErrorMessage(error)}`));
    }

    const rows = buildContextRows(mentions, skill, graph);

    if (rows.length > 0) {
      console.log("\nlink context (uuid -> skill / resource):\n");
      console.log(formatContextTable(rows));
    }
  }

  ui.log.info(pc.dim(`next: better-skills update ${skill.id} --from ${targetDir}`));
}
