import * as p from "@clack/prompts";
import pc from "picocolors";

import { readSessionSync } from "../lib/session";
import { trpc } from "../lib/trpc";

export async function whoamiCommand() {
  if (!readSessionSync()) {
    p.log.warn("not authenticated — run login first");
    return;
  }

  const s = p.spinner();
  s.start("fetching session");

  try {
    const result = await trpc.privateData.query();
    s.stop(pc.green(`logged in as ${result.user.name ?? result.user.email}`));
  } catch {
    s.stop(pc.yellow("session invalid or expired — run login again"));
  }
}
