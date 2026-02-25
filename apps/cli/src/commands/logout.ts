import * as p from "@clack/prompts";
import pc from "picocolors";

import { env } from "@omniskill/env/cli";
import { clearSession, readSessionSync } from "../lib/session";

export async function logoutCommand() {
  const session = readSessionSync();

  if (!session) {
    p.log.warn("not authenticated — nothing to do");
    return;
  }

  const s = p.spinner();
  s.start("signing out");

  try {
    await fetch(`${env.SERVER_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
      },
    });
  } catch {
    // server unreachable — still clear local session
  }

  await clearSession();
  s.stop(pc.green("logged out"));
}
