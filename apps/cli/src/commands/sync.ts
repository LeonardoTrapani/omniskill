import pc from "picocolors";

import { getAgentDisplayName, resolveInstallAgents } from "../lib/agents";
import type { SupportedAgent } from "../lib/agents";
import { readErrorMessage } from "../lib/errors";
import {
  installSkill,
  readInstallLock,
  toInstallableSkill,
  uninstallSkill,
} from "../lib/skills-installer";
import { maybePromptUnsyncedLocalSkillsBackup } from "../lib/unsynced-local-skills";
import { trpc } from "../lib/trpc";
import * as ui from "../lib/ui";

const SYNC_PAGE_LIMIT = 100;

type SkillListOutput = Awaited<ReturnType<typeof trpc.skills.list.query>>;
type SkillListItem = SkillListOutput["items"][number];

type SyncRunResult = {
  ok: boolean;
  authenticated: boolean;
  totalSkills: number;
  syncedSkills: number;
  failedSkills: number;
  removedStaleSkills: number;
};

async function fetchAllSkills(): Promise<SkillListItem[]> {
  const items: SkillListItem[] = [];
  let cursor: string | undefined;

  for (;;) {
    const result = await trpc.skills.list.query({
      limit: SYNC_PAGE_LIMIT,
      cursor,
    });

    items.push(...result.items);

    if (!result.nextCursor) {
      return items;
    }

    cursor = result.nextCursor;
  }
}

async function syncSkills(
  selectedAgents: SupportedAgent[],
  options?: {
    promptUnsyncedBackup?: boolean;
  },
): Promise<SyncRunResult> {
  const promptUnsyncedBackup = options?.promptUnsyncedBackup ?? true;

  ui.log.info(`targets: ${selectedAgents.map((agent) => getAgentDisplayName(agent)).join(", ")}`);

  const authSpinner = ui.spinner();
  authSpinner.start("checking authentication");

  try {
    await trpc.me.query();
    authSpinner.stop(pc.green("authenticated"));
  } catch {
    authSpinner.stop(pc.red("not authenticated - run better-skills login"));
    return {
      ok: false,
      authenticated: false,
      totalSkills: 0,
      syncedSkills: 0,
      failedSkills: 0,
      removedStaleSkills: 0,
    };
  }

  const fetchSpinner = ui.spinner();
  fetchSpinner.start("loading skills");

  let privateSkills: SkillListItem[];
  try {
    privateSkills = await fetchAllSkills();
  } catch (error) {
    fetchSpinner.stop(pc.red(`failed to load skills: ${readErrorMessage(error)}`));
    return {
      ok: false,
      authenticated: true,
      totalSkills: 0,
      syncedSkills: 0,
      failedSkills: 0,
      removedStaleSkills: 0,
    };
  }

  if (privateSkills.length === 0) {
    fetchSpinner.stop(pc.dim("no skills to sync"));
    if (promptUnsyncedBackup) {
      await maybePromptUnsyncedLocalSkillsBackup(selectedAgents);
    }
    return {
      ok: true,
      authenticated: true,
      totalSkills: 0,
      syncedSkills: 0,
      failedSkills: 0,
      removedStaleSkills: 0,
    };
  }

  fetchSpinner.stop(pc.green(`syncing ${privateSkills.length} skill(s)`));

  const serverSkillIds = new Set(privateSkills.map((s) => s.id));

  let synced = 0;
  let failed = 0;

  for (const [index, item] of privateSkills.entries()) {
    const spinner = ui.spinner();
    spinner.start(`syncing ${item.slug} (${index + 1}/${privateSkills.length})`);

    try {
      const skill = await trpc.skills.getById.query({ id: item.id, linkMentions: false });
      await installSkill(toInstallableSkill(skill), selectedAgents);
      synced += 1;
      spinner.stop(pc.green(`synced ${item.slug}`));
    } catch (error) {
      failed += 1;
      spinner.stop(pc.red(`failed ${item.slug}: ${readErrorMessage(error)}`));
    }
  }

  // prune skills that no longer exist on the server
  const latestLock = await readInstallLock();
  const staleEntries = Object.entries(latestLock.skills).filter(
    ([, entry]) => !serverSkillIds.has(entry.skillId),
  );

  let removedStaleSkills = 0;

  if (staleEntries.length > 0) {
    for (const [folder, entry] of staleEntries) {
      const spinner = ui.spinner();
      spinner.start(`removing ${entry.slug}`);

      try {
        await uninstallSkill(folder);
        removedStaleSkills += 1;
        spinner.stop(pc.green(`removed ${entry.slug}`));
      } catch (error) {
        spinner.stop(pc.red(`failed to remove ${entry.slug}: ${readErrorMessage(error)}`));
      }
    }

    ui.log.info(pc.dim(`removed ${removedStaleSkills} skill(s) no longer on server`));
  }

  ui.log.info(pc.dim(`synced ${synced}/${privateSkills.length} skill(s)`));

  if (promptUnsyncedBackup) {
    await maybePromptUnsyncedLocalSkillsBackup(selectedAgents);
  }

  return {
    ok: failed === 0,
    authenticated: true,
    totalSkills: privateSkills.length,
    syncedSkills: synced,
    failedSkills: failed,
    removedStaleSkills,
  };
}

export async function syncCommand() {
  const selectedAgents = await resolveInstallAgents();

  if (selectedAgents.length === 0) {
    ui.log.error("no agents selected");
    return;
  }

  await syncSkills(selectedAgents, { promptUnsyncedBackup: true });
}
