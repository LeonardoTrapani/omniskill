import * as p from "@clack/prompts";
import pc from "picocolors";

import { getAgentDisplayName, resolveInstallAgents, type SupportedAgent } from "../lib/agents";
import { installSkill, type InstallableSkill } from "../lib/skills-installer";
import { trpc } from "../lib/trpc";

const BROWSE_PAGE_LIMIT = 20;
const BROWSE_MAX_PAGES = 5;
const SYNC_PAGE_LIMIT = 100;

type SkillListOutput = Awaited<ReturnType<typeof trpc.skills.list.query>>;
type SkillListItem = SkillListOutput["items"][number];
type SkillDetails = Awaited<ReturnType<typeof trpc.skills.getBySlug.query>>;

type SkillsListCommandOptions = {
  limit?: number;
  search?: string;
  visibility?: "public" | "private";
};

type SkillsInstallCommandOptions = {
  slug?: string;
};

function toTimestamp(value: Date | string): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  return new Date(value).getTime();
}

function sortPrivateFirst(items: SkillListItem[]): SkillListItem[] {
  return [...items].sort((left, right) => {
    if (left.visibility !== right.visibility) {
      return left.visibility === "private" ? -1 : 1;
    }

    return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
  });
}

function trimDescription(value: string, maxLength = 64): string {
  const input = value.trim();
  if (input.length <= maxLength) {
    return input;
  }
  return `${input.slice(0, maxLength - 3)}...`;
}

function formatSkillHint(skill: SkillListItem): string {
  return `${skill.visibility} | ${trimDescription(skill.description)}`;
}

function toInstallableSkill(skill: SkillDetails): InstallableSkill {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    visibility: skill.visibility,
    originalMarkdown: skill.originalMarkdown,
    resources: skill.resources.map((resource) => ({
      path: resource.path,
      content: resource.content,
    })),
    sourceUrl: skill.sourceUrl,
    sourceIdentifier: skill.sourceIdentifier,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fetchBrowseSkills(): Promise<{ items: SkillListItem[]; truncated: boolean }> {
  const collected: SkillListItem[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;

  for (let page = 0; page < BROWSE_MAX_PAGES; page += 1) {
    const result = await trpc.skills.list.query({
      limit: BROWSE_PAGE_LIMIT,
      cursor,
    });

    for (const item of result.items) {
      if (seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      collected.push(item);
    }

    if (!result.nextCursor) {
      return {
        items: sortPrivateFirst(collected),
        truncated: false,
      };
    }

    cursor = result.nextCursor;
  }

  return {
    items: sortPrivateFirst(collected),
    truncated: true,
  };
}

async function chooseSkillSlugFromBrowse(): Promise<string | null> {
  const spinner = p.spinner();
  spinner.start("loading skills catalog");

  try {
    const result = await fetchBrowseSkills();

    if (result.items.length === 0) {
      spinner.stop(pc.dim("no skills found"));
      return null;
    }

    if (result.truncated) {
      spinner.stop(pc.yellow(`loaded ${result.items.length} skills (limited set, type to narrow)`));
    } else {
      spinner.stop(pc.green(`loaded ${result.items.length} skills`));
    }

    const selected = await p.autocomplete<string>({
      message: "search and pick a skill to install",
      placeholder: "start typing name, slug, visibility, or description",
      maxItems: 12,
      options: result.items.map((skill) => ({
        value: skill.slug,
        label: `${skill.name} (${skill.slug})`,
        hint: formatSkillHint(skill),
      })),
      filter: (search, option) => {
        const query = search.trim().toLowerCase();
        if (query.length === 0) {
          return true;
        }

        const candidate = `${option.label ?? ""} ${option.hint ?? ""} ${String(option.value)}`
          .toLowerCase()
          .trim();

        return candidate.includes(query);
      },
    });

    if (p.isCancel(selected)) {
      p.cancel("cancelled");
      return null;
    }

    return selected;
  } catch (error) {
    spinner.stop(pc.red(`failed to load skills: ${errorMessage(error)}`));
    return null;
  }
}

async function installBySlug(slug: string, agents: SupportedAgent[]) {
  const spinner = p.spinner();
  spinner.start(`installing ${slug}`);

  try {
    const skill = await trpc.skills.getBySlug.query({ slug });
    const result = await installSkill(toInstallableSkill(skill), agents);

    spinner.stop(pc.green(`installed ${skill.name} (${skill.slug})`));
    p.log.info(`canonical: ${pc.dim(result.canonicalPath)}`);

    for (const target of result.targets) {
      const status = target.symlinkFailed ? pc.yellow("copy fallback") : pc.green("symlinked");
      p.log.info(`${status} ${getAgentDisplayName(target.agent)} ${pc.dim(`-> ${target.path}`)}`);
    }

    if (result.skippedResources.length > 0) {
      p.log.warn(`skipped ${result.skippedResources.length} unsafe resource path(s)`);
    }
  } catch (error) {
    spinner.stop(pc.red(`failed to install ${slug}: ${errorMessage(error)}`));
  }
}

async function fetchAllPrivateSkills(): Promise<SkillListItem[]> {
  const items: SkillListItem[] = [];
  let cursor: string | undefined;

  for (;;) {
    const result = await trpc.skills.list.query({
      limit: SYNC_PAGE_LIMIT,
      cursor,
      visibility: "private",
    });

    items.push(...result.items);

    if (!result.nextCursor) {
      return items;
    }

    cursor = result.nextCursor;
  }
}

export async function skillsListCommand(options: SkillsListCommandOptions = {}) {
  const spinner = p.spinner();
  spinner.start("fetching skills");

  try {
    const result = await trpc.skills.list.query({
      limit: options.limit ?? 10,
      search: options.search,
      visibility: options.visibility,
    });

    if (result.items.length === 0) {
      spinner.stop(pc.dim("no skills found"));
      return;
    }

    spinner.stop(pc.green(`found ${result.items.length} skill(s)`));

    for (const skill of sortPrivateFirst(result.items)) {
      p.log.info(
        `${pc.bold(skill.name)} ${pc.dim(`(${skill.slug})`)} ${pc.dim(`[${skill.visibility}]`)} - ${skill.description}`,
      );
    }

    if (result.nextCursor) {
      p.log.info(pc.dim("more results available"));
    }
  } catch (error) {
    spinner.stop(pc.red(`failed to fetch skills: ${errorMessage(error)}`));
  }
}

export async function skillsInstallCommand(options: SkillsInstallCommandOptions = {}) {
  const selectedAgents = await resolveInstallAgents();

  if (selectedAgents.length === 0) {
    p.log.error("no agents selected");
    return;
  }

  p.log.info(`targets: ${selectedAgents.map((agent) => getAgentDisplayName(agent)).join(", ")}`);

  const slug = options.slug ?? (await chooseSkillSlugFromBrowse());
  if (!slug) {
    return;
  }

  await installBySlug(slug, selectedAgents);
}

export async function skillsSyncCommand() {
  const selectedAgents = await resolveInstallAgents();

  if (selectedAgents.length === 0) {
    p.log.error("no agents selected");
    return;
  }

  p.log.info(`targets: ${selectedAgents.map((agent) => getAgentDisplayName(agent)).join(", ")}`);

  const authSpinner = p.spinner();
  authSpinner.start("checking authentication");

  try {
    await trpc.privateData.query();
    authSpinner.stop(pc.green("authenticated"));
  } catch {
    authSpinner.stop(pc.red("not authenticated - sign in from the web app first"));
    return;
  }

  const fetchSpinner = p.spinner();
  fetchSpinner.start("loading private skills");

  let privateSkills: SkillListItem[];
  try {
    privateSkills = await fetchAllPrivateSkills();
  } catch (error) {
    fetchSpinner.stop(pc.red(`failed to load private skills: ${errorMessage(error)}`));
    return;
  }

  if (privateSkills.length === 0) {
    fetchSpinner.stop(pc.dim("no private skills to sync"));
    return;
  }

  fetchSpinner.stop(pc.green(`syncing ${privateSkills.length} private skill(s)`));

  let synced = 0;

  for (const [index, item] of privateSkills.entries()) {
    const spinner = p.spinner();
    spinner.start(`syncing ${item.slug} (${index + 1}/${privateSkills.length})`);

    try {
      const skill = await trpc.skills.getById.query({ id: item.id });
      await installSkill(toInstallableSkill(skill), selectedAgents);
      synced += 1;
      spinner.stop(pc.green(`synced ${item.slug}`));
    } catch (error) {
      spinner.stop(pc.red(`failed ${item.slug}: ${errorMessage(error)}`));
    }
  }

  p.log.info(pc.dim(`synced ${synced}/${privateSkills.length} private skill(s)`));
}
