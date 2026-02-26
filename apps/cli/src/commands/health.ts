import pc from "picocolors";

import { readErrorMessage } from "../lib/errors";
import { trpc } from "../lib/trpc";
import * as ui from "../lib/ui";

export async function healthCommand() {
  const s = ui.spinner();
  s.start("checking server connection");

  try {
    const result = await trpc.healthCheck.query();
    s.stop(pc.green(`server responded: ${result}`));
  } catch (error) {
    s.stop(pc.red(`server unreachable: ${readErrorMessage(error)}`));
  }
}
