import { cp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

import matter from "gray-matter";

import { env } from "@omniskill/env/cli";

import type { SupportedAgent } from "./agents";
import { getAgentSkillDir } from "./agents";

const OMNISKILL_SKILLS_DIR = join(homedir(), ".omniskill", "skills");
const LOCK_FILE_PATH = join(OMNISKILL_SKILLS_DIR, "lock.json");
const INSTALL_METADATA_FILE = ".omniskill-install.json";

type SkillResourceInput = {
  path: string;
  content: string;
};

export type InstallableSkill = {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  renderedMarkdown: string;
  frontmatter: Record<string, unknown>;
  resources: SkillResourceInput[];
  sourceUrl: string | null;
  sourceIdentifier: string | null;
};

export type AgentInstallResult = {
  agent: SupportedAgent;
  path: string;
  mode: "symlink" | "copy";
  symlinkFailed: boolean;
};

export type InstallSkillResult = {
  slug: string;
  canonicalPath: string;
  skippedResources: string[];
  targets: AgentInstallResult[];
};

export type InstallLock = {
  version: 1;
  updatedAt: string;
  skills: Record<string, InstallLockSkillEntry>;
};

type InstallLockSkillEntry = {
  skillId: string;
  slug: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  canonicalPath: string;
  source: {
    type: "omniskill-api";
    serverUrl: string;
    sourceUrl: string | null;
    sourceIdentifier: string | null;
  };
  updatedAt: string;
  targets: Record<string, InstallLockSkillTarget>;
};

type InstallLockSkillTarget = {
  path: string;
  mode: "symlink" | "copy";
  symlinkFailed: boolean;
  installedAt: string;
};

function sanitizeName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

  return sanitized.slice(0, 255) || "unnamed-skill";
}

function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = resolve(basePath);
  const normalizedTarget = resolve(targetPath);
  return (
    normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}${sep}`)
  );
}

async function cleanDirectory(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
  await mkdir(path, { recursive: true });
}

async function writeCanonicalSkill(
  skill: InstallableSkill,
  canonicalPath: string,
): Promise<{ skippedResources: string[] }> {
  const skillMdPath = join(canonicalPath, "SKILL.md");
  const fullMarkdown = matter.stringify(skill.renderedMarkdown, skill.frontmatter);
  await writeFile(skillMdPath, fullMarkdown, "utf8");

  const skippedResources: string[] = [];

  for (const resource of skill.resources) {
    const resourcePath = resolve(canonicalPath, resource.path);

    if (!isPathSafe(canonicalPath, resourcePath)) {
      skippedResources.push(resource.path);
      continue;
    }

    await mkdir(dirname(resourcePath), { recursive: true });
    await writeFile(resourcePath, resource.content, "utf8");
  }

  const metadataPath = join(canonicalPath, INSTALL_METADATA_FILE);
  await writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        skillId: skill.id,
        slug: skill.slug,
        name: skill.name,
        visibility: skill.visibility,
        installedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return { skippedResources };
}

async function createSymlink(targetPath: string, linkPath: string): Promise<boolean> {
  try {
    const resolvedTarget = resolve(targetPath);
    const resolvedLinkPath = resolve(linkPath);

    if (resolvedTarget === resolvedLinkPath) {
      return true;
    }

    await rm(linkPath, { recursive: true, force: true });
    await mkdir(dirname(linkPath), { recursive: true });

    const realLinkParent = await realpath(dirname(linkPath)).catch(() => dirname(linkPath));
    const relativeTarget = relative(realLinkParent, targetPath);

    await symlink(relativeTarget, linkPath, platform() === "win32" ? "junction" : undefined);
    return true;
  } catch {
    return false;
  }
}

async function linkSkillToAgent(
  canonicalPath: string,
  agent: SupportedAgent,
  skillFolder: string,
): Promise<AgentInstallResult> {
  const agentBase = getAgentSkillDir(agent);
  const agentSkillPath = join(agentBase, skillFolder);

  if (!isPathSafe(agentBase, agentSkillPath)) {
    throw new Error(`invalid skill path for agent ${agent}`);
  }

  const linked = await createSymlink(canonicalPath, agentSkillPath);
  if (linked) {
    return {
      agent,
      path: agentSkillPath,
      mode: "symlink",
      symlinkFailed: false,
    };
  }

  await rm(agentSkillPath, { recursive: true, force: true });
  await mkdir(dirname(agentSkillPath), { recursive: true });
  await cp(canonicalPath, agentSkillPath, { recursive: true, dereference: true });

  return {
    agent,
    path: agentSkillPath,
    mode: "copy",
    symlinkFailed: true,
  };
}

export async function readInstallLock(): Promise<InstallLock> {
  try {
    const raw = await readFile(LOCK_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<InstallLock>;

    if (parsed.version !== 1 || typeof parsed.skills !== "object" || parsed.skills === null) {
      return {
        version: 1,
        updatedAt: new Date(0).toISOString(),
        skills: {},
      };
    }

    return {
      version: 1,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      skills: parsed.skills as InstallLock["skills"],
    };
  } catch {
    return {
      version: 1,
      updatedAt: new Date(0).toISOString(),
      skills: {},
    };
  }
}

async function writeInstallLock(
  skillFolder: string,
  skill: InstallableSkill,
  result: InstallSkillResult,
) {
  const lock = await readInstallLock();
  const now = new Date().toISOString();
  const targets = Object.fromEntries(
    result.targets.map((target) => [
      target.agent,
      {
        path: target.path,
        mode: target.mode,
        symlinkFailed: target.symlinkFailed,
        installedAt: now,
      } satisfies InstallLockSkillTarget,
    ]),
  );

  lock.updatedAt = now;
  lock.skills[skillFolder] = {
    skillId: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    visibility: skill.visibility,
    canonicalPath: result.canonicalPath,
    source: {
      type: "omniskill-api",
      serverUrl: env.SERVER_URL,
      sourceUrl: skill.sourceUrl,
      sourceIdentifier: skill.sourceIdentifier,
    },
    updatedAt: now,
    targets,
  };

  await mkdir(OMNISKILL_SKILLS_DIR, { recursive: true });
  await writeFile(LOCK_FILE_PATH, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

export async function uninstallSkill(skillFolder: string): Promise<void> {
  const lock = await readInstallLock();
  const entry = lock.skills[skillFolder];

  // remove canonical dir
  const canonicalPath = entry?.canonicalPath ?? join(OMNISKILL_SKILLS_DIR, skillFolder);
  await rm(canonicalPath, { recursive: true, force: true });

  // remove agent symlinks / copies
  if (entry?.targets) {
    await Promise.all(
      Object.values(entry.targets).map((target) =>
        rm(target.path, { recursive: true, force: true }),
      ),
    );
  }

  // remove from lock file
  delete lock.skills[skillFolder];
  lock.updatedAt = new Date().toISOString();
  await mkdir(OMNISKILL_SKILLS_DIR, { recursive: true });
  await writeFile(LOCK_FILE_PATH, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

export async function installSkill(
  skill: InstallableSkill,
  agents: SupportedAgent[],
): Promise<InstallSkillResult> {
  const skillFolder = sanitizeName(skill.slug);
  const canonicalPath = join(OMNISKILL_SKILLS_DIR, skillFolder);

  if (!isPathSafe(OMNISKILL_SKILLS_DIR, canonicalPath)) {
    throw new Error("invalid skill slug");
  }

  await mkdir(OMNISKILL_SKILLS_DIR, { recursive: true });
  await cleanDirectory(canonicalPath);
  const canonicalWrite = await writeCanonicalSkill(skill, canonicalPath);

  const targets: AgentInstallResult[] = [];

  for (const agent of new Set(agents)) {
    const target = await linkSkillToAgent(canonicalPath, agent, skillFolder);
    targets.push(target);
  }

  const result: InstallSkillResult = {
    slug: skill.slug,
    canonicalPath,
    skippedResources: canonicalWrite.skippedResources,
    targets,
  };

  await writeInstallLock(skillFolder, skill, result);

  return result;
}
