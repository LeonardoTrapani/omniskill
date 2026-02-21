import { homedir } from "node:os";
import { join } from "node:path";

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
    displayName: "Continue",
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

export async function resolveInstallAgents(): Promise<SupportedAgent[]> {
  return [...supportedAgents];
}
