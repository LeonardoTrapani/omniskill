import pc from "picocolors";

import { env } from "@better-skills/env/cli";
import { clearSession, readSessionSync } from "../lib/session";
import * as ui from "../lib/ui";

export async function logoutCommand() {
  const session = readSessionSync();

  if (!session) {
    ui.log.warn("not authenticated — nothing to do");
    return;
  }

  const s = ui.spinner();
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
