import * as p from "@clack/prompts";
import pc from "picocolors";

import { readErrorMessage } from "../lib/errors";
import { trpc } from "../lib/trpc";

export async function healthCommand() {
  const s = p.spinner();
  s.start("checking server connection");

  try {
    const result = await trpc.healthCheck.query();
    s.stop(pc.green(`server responded: ${result}`));
  } catch (error) {
    s.stop(pc.red(`server unreachable: ${readErrorMessage(error)}`));
  }
}
