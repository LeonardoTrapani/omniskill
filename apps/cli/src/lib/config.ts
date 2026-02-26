import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { SupportedAgent } from "./agents";
import { supportedAgents } from "./agents";

const CONFIG_VERSION = 1;

type StoredConfig = {
  version: number;
  agents: string[];
  preferences?: {
    skipUnsyncedBackupPrompt?: boolean;
  };
};

type CliPreferences = {
  skipUnsyncedBackupPrompt: boolean;
};

const DEFAULT_PREFERENCES: CliPreferences = {
  skipUnsyncedBackupPrompt: false,
};

function getConfigDir() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return join(xdgConfigHome, "better-skills");
  }

  return join(homedir(), ".config", "better-skills");
}

function getConfigFilePath() {
  return join(getConfigDir(), "config.json");
}

function parseStoredConfig(raw: string): StoredConfig | null {
  try {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.version !== "number" ||
      !Array.isArray(parsed.agents) ||
      !parsed.agents.every((a: unknown) => typeof a === "string")
    ) {
      return null;
    }

    let preferences: StoredConfig["preferences"];
    if (typeof parsed.preferences === "object" && parsed.preferences !== null) {
      const maybeSkipPrompt =
        "skipUnsyncedBackupPrompt" in parsed.preferences
          ? parsed.preferences.skipUnsyncedBackupPrompt
          : undefined;

      if (typeof maybeSkipPrompt === "boolean") {
        preferences = { skipUnsyncedBackupPrompt: maybeSkipPrompt };
      }
    }

    return {
      version: parsed.version,
      agents: parsed.agents,
      ...(preferences ? { preferences } : {}),
    };
  } catch {
    return null;
  }
}

function readStoredConfig(): StoredConfig | null {
  const configPath = getConfigFilePath();
  if (!existsSync(configPath)) {
    return null;
  }

  const parsed = parseStoredConfig(readFileSync(configPath, "utf8"));
  if (!parsed || parsed.version !== CONFIG_VERSION) {
    return null;
  }

  return parsed;
}

function getValidAgents(agents: string[]): SupportedAgent[] {
  return agents.filter((a): a is SupportedAgent => supportedAgents.includes(a as SupportedAgent));
}

async function writeConfigFile(config: StoredConfig) {
  const configDir = getConfigDir();
  await mkdir(configDir, { recursive: true });
  await writeFile(getConfigFilePath(), JSON.stringify(config, null, 2), "utf8");
}

export function readConfig(): SupportedAgent[] | null {
  const parsed = readStoredConfig();
  if (!parsed) {
    return null;
  }

  // filter out agents that are no longer supported
  const valid = getValidAgents(parsed.agents);

  return valid.length > 0 ? valid : null;
}

export function readCliPreferences(): CliPreferences {
  const parsed = readStoredConfig();

  return {
    skipUnsyncedBackupPrompt:
      parsed?.preferences?.skipUnsyncedBackupPrompt ?? DEFAULT_PREFERENCES.skipUnsyncedBackupPrompt,
  };
}

export async function saveConfig(agents: SupportedAgent[]) {
  const current = readStoredConfig();

  const config: StoredConfig = {
    version: CONFIG_VERSION,
    agents,
    ...(current?.preferences ? { preferences: current.preferences } : {}),
  };

  await writeConfigFile(config);
}

export async function saveCliPreferences(preferences: Partial<CliPreferences>) {
  const current = readStoredConfig();
  const currentAgents = current ? getValidAgents(current.agents) : [];

  const nextPreferences: CliPreferences = {
    ...DEFAULT_PREFERENCES,
    ...current?.preferences,
    ...preferences,
  };

  const config: StoredConfig = {
    version: CONFIG_VERSION,
    agents: currentAgents,
    preferences: nextPreferences,
  };

  await writeConfigFile(config);
}
