import pc from "picocolors";

import { getAgentDisplayName, promptAgentSelection } from "../lib/agents";
import type { SupportedAgent } from "../lib/agents";
import { readConfig, saveConfig } from "../lib/config";
import { maybePromptUnsyncedLocalSkillsBackup } from "../lib/unsynced-local-skills";
import * as ui from "../lib/ui";

export async function configCommand() {
  const current = readConfig();

  if (current) {
    ui.log.info(`current agents: ${current.map((a) => getAgentDisplayName(a)).join(", ")}`);
  } else {
    ui.log.info(pc.dim("no agent configuration found yet"));
  }

  const selected = await promptAgentSelection(current ?? undefined);

  if (!selected) {
    ui.log.warn("cancelled");
    return;
  }

  if (selected.length === 0) {
    ui.log.error("you must select at least one agent");
    return;
  }

  await saveConfig(selected);

  const added = selected.filter((a) => !current?.includes(a));
  const removed = current?.filter((a) => !selected.includes(a as SupportedAgent)) ?? [];

  if (added.length === 0 && removed.length === 0) {
    ui.log.info(pc.dim("no changes"));
    await maybePromptUnsyncedLocalSkillsBackup(selected);
    return;
  }

  if (added.length > 0) {
    ui.log.success(`added: ${added.map((a) => getAgentDisplayName(a)).join(", ")}`);
  }

  if (removed.length > 0) {
    ui.log.info(
      `removed: ${removed.map((a) => getAgentDisplayName(a as SupportedAgent)).join(", ")}`,
    );
  }

  ui.log.success(pc.dim("configuration saved"));
  await maybePromptUnsyncedLocalSkillsBackup(selected);
}
