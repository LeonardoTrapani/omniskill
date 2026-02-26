import { homedir } from "node:os";
import { join } from "node:path";

import pc from "picocolors";

import { readConfig, saveConfig } from "./config";
import { isPlain } from "./output-mode";
import * as ui from "./ui";

const home = homedir();
const configHome = process.env.XDG_CONFIG_HOME?.trim() || join(home, ".config");
const codexHome = process.env.CODEX_HOME?.trim() || join(home, ".codex");
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, ".claude");

type AgentConfig = {
  displayName: string;
  globalSkillsDir: string;
};

const AGENTS = {
  opencode: {
    displayName: "OpenCode",
    globalSkillsDir: join(configHome, "opencode/skills"),
  },
  "claude-code": {
    displayName: "Claude Code",
    globalSkillsDir: join(claudeHome, "skills"),
  },
  codex: {
    displayName: "Codex",
    globalSkillsDir: join(codexHome, "skills"),
  },
  cursor: {
    displayName: "Cursor",
    globalSkillsDir: join(home, ".cursor/skills"),
  },
  "github-copilot": {
    displayName: "GitHub Copilot",
    globalSkillsDir: join(home, ".copilot/skills"),
  },
  "gemini-cli": {
    displayName: "Gemini CLI",
    globalSkillsDir: join(home, ".gemini/skills"),
  },
  amp: {
    displayName: "Amp",
    globalSkillsDir: join(configHome, "agents/skills"),
  },
  goose: {
    displayName: "Goose",
    globalSkillsDir: join(configHome, "goose/skills"),
  },
  continue: {
    displayName: "Continue.dev",
    globalSkillsDir: join(home, ".continue/skills"),
  },
} as const satisfies Record<string, AgentConfig>;

export type SupportedAgent = keyof typeof AGENTS;

export const supportedAgents = Object.keys(AGENTS) as SupportedAgent[];

export function getAgentDisplayName(agent: SupportedAgent): string {
  return AGENTS[agent].displayName;
}

export function getAgentSkillDir(agent: SupportedAgent): string {
  return AGENTS[agent].globalSkillsDir;
}

export async function promptAgentSelection(
  initial?: SupportedAgent[],
): Promise<SupportedAgent[] | null> {
  if (isPlain) {
    // non-interactive: return saved config or all agents as default
    return initial ?? supportedAgents;
  }

  const result = await ui.multiselect({
    message: "which agents do you want to install skills to?",
    options: supportedAgents.map((key) => ({
      value: key,
      label: AGENTS[key].displayName,
    })),
    initialValues: initial ?? [],
    required: true,
  });

  if (ui.isCancel(result)) {
    return null;
  }

  return result as SupportedAgent[];
}

export async function resolveInstallAgents(): Promise<SupportedAgent[]> {
  const saved = readConfig();

  if (saved) {
    return saved;
  }

  if (isPlain) {
    // non-interactive first run: use all agents and persist
    await saveConfig(supportedAgents as unknown as SupportedAgent[]);
    return [...supportedAgents];
  }

  ui.log.info(pc.dim("no agent configuration found - let's set one up"));

  const selected = await promptAgentSelection(supportedAgents);

  if (!selected || selected.length === 0) {
    return [];
  }

  await saveConfig(selected);
  ui.log.success(pc.dim("saved agent configuration"));

  return selected;
}
