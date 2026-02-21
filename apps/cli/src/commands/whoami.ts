import * as p from "@clack/prompts";
import pc from "picocolors";

import { trpc } from "../lib/trpc";

export async function whoamiCommand() {
  const s = p.spinner();
  s.start("fetching session");

  try {
    const result = await trpc.privateData.query();
    s.stop(pc.green(`logged in as ${result.user.name ?? result.user.email}`));
  } catch {
    s.stop(pc.yellow("not authenticated — sign in from the web app first"));
  }
}
