import * as p from "@clack/prompts";
import pc from "picocolors";

import { trpc } from "../lib/trpc";

export async function healthCommand() {
  const s = p.spinner();
  s.start("checking server connection");

  try {
    const result = await trpc.healthCheck.query();
    s.stop(pc.green(`server responded: ${result}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    s.stop(pc.red(`server unreachable: ${message}`));
  }
}
