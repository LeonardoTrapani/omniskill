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
};

function getConfigDir() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return join(xdgConfigHome, "omniscient");
  }

  return join(homedir(), ".config", "omniscient");
}

export function getConfigFilePath() {
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

    return parsed as StoredConfig;
  } catch {
    return null;
  }
}

export function readConfig(): SupportedAgent[] | null {
  const configPath = getConfigFilePath();
  if (!existsSync(configPath)) {
    return null;
  }

  const parsed = parseStoredConfig(readFileSync(configPath, "utf8"));
  if (!parsed || parsed.version !== CONFIG_VERSION) {
    return null;
  }

  // filter out agents that are no longer supported
  const valid = parsed.agents.filter((a): a is SupportedAgent =>
    supportedAgents.includes(a as SupportedAgent),
  );

  return valid.length > 0 ? valid : null;
}

export async function saveConfig(agents: SupportedAgent[]) {
  const configDir = getConfigDir();
  await mkdir(configDir, { recursive: true });

  const config: StoredConfig = {
    version: CONFIG_VERSION,
    agents,
  };

  await writeFile(getConfigFilePath(), JSON.stringify(config, null, 2), "utf8");
}
