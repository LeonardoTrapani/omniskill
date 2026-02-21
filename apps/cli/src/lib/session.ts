import { existsSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const SESSION_VERSION = 1;

type StoredSession = {
  version: number;
  accessToken: string;
  tokenType: string;
  createdAt: string;
  expiresAt: string;
};

function getConfigDir() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return join(xdgConfigHome, "omniscient");
  }

  return join(homedir(), ".config", "omniscient");
}

export function getSessionFilePath() {
  return join(getConfigDir(), "session.json");
}

function parseStoredSession(raw: string): StoredSession | null {
  try {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.accessToken !== "string" ||
      parsed.accessToken.length === 0 ||
      typeof parsed.tokenType !== "string" ||
      parsed.tokenType.length === 0 ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.expiresAt !== "string" ||
      typeof parsed.version !== "number"
    ) {
      return null;
    }

    return parsed as StoredSession;
  } catch {
    return null;
  }
}

export function readSessionSync() {
  const sessionPath = getSessionFilePath();
  if (!existsSync(sessionPath)) {
    return null;
  }

  const parsed = parseStoredSession(readFileSync(sessionPath, "utf8"));
  if (!parsed) {
    return null;
  }

  if (parsed.version !== SESSION_VERSION) {
    return null;
  }

  return parsed;
}

export async function saveSession({
  accessToken,
  tokenType,
  expiresIn,
}: {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}) {
  const configDir = getConfigDir();
  await mkdir(configDir, { recursive: true });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresIn * 1000);

  const session: StoredSession = {
    version: SESSION_VERSION,
    accessToken,
    tokenType,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await writeFile(getSessionFilePath(), JSON.stringify(session, null, 2), "utf8");
}

export async function clearSession() {
  await rm(getSessionFilePath(), { force: true });
}
