import pc from "picocolors";

import { readSessionSync } from "../lib/session";
import { trpc } from "../lib/trpc";
import * as ui from "../lib/ui";

export async function whoamiCommand() {
  if (!readSessionSync()) {
    ui.log.warn("not authenticated — run login first");
    return;
  }

  const s = ui.spinner();
  s.start("fetching session");

  try {
    const result = await trpc.me.query();
    s.stop(pc.green(`logged in as ${result.user.name ?? result.user.email}`));
  } catch {
    s.stop(pc.yellow("session invalid or expired — run login again"));
  }
}
