import * as p from "@clack/prompts";
import pc from "picocolors";

import { getAgentDisplayName, resolveInstallAgents } from "../lib/agents";
import {
  installSkill,
  readInstallLock,
  uninstallSkill,
  type InstallableSkill,
} from "../lib/skills-installer";
import { trpc } from "../lib/trpc";

const SYNC_PAGE_LIMIT = 100;

type SkillListOutput = Awaited<ReturnType<typeof trpc.skills.list.query>>;
type SkillListItem = SkillListOutput["items"][number];
type SkillDetails = Awaited<ReturnType<typeof trpc.skills.getBySlug.query>>;

function toInstallableSkill(skill: SkillDetails): InstallableSkill {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    visibility: skill.visibility,
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

export async function syncCommand() {
  const selectedAgents = await resolveInstallAgents();

  if (selectedAgents.length === 0) {
    p.log.error("no agents selected");
    return;
  }

  p.log.info(`targets: ${selectedAgents.map((agent) => getAgentDisplayName(agent)).join(", ")}`);

  const authSpinner = p.spinner();
  authSpinner.start("checking authentication");

  try {
    await trpc.me.query();
    authSpinner.stop(pc.green("authenticated"));
  } catch {
    authSpinner.stop(pc.red("not authenticated - run omniskill login"));
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

  const lock = await readInstallLock();
  const serverSkillIds = new Set(privateSkills.map((s) => s.id));

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

  // prune skills that no longer exist on the server
  const staleEntries = Object.entries(lock.skills).filter(
    ([, entry]) => !serverSkillIds.has(entry.skillId),
  );

  if (staleEntries.length > 0) {
    for (const [folder, entry] of staleEntries) {
      const spinner = p.spinner();
      spinner.start(`removing ${entry.slug}`);

      try {
        await uninstallSkill(folder);
        spinner.stop(pc.green(`removed ${entry.slug}`));
      } catch (error) {
        spinner.stop(pc.red(`failed to remove ${entry.slug}: ${errorMessage(error)}`));
      }
    }

    p.log.info(pc.dim(`removed ${staleEntries.length} skill(s) no longer on server`));
  }

  p.log.info(pc.dim(`synced ${synced}/${privateSkills.length} private skill(s)`));
}
