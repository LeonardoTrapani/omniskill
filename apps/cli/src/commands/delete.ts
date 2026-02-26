import pc from "picocolors";

import { readErrorMessage } from "../lib/errors";
import { isPlain } from "../lib/output-mode";
import { trpc } from "../lib/trpc";
import * as ui from "../lib/ui";
import { UUID_RE } from "../lib/uuid";

export async function deleteCommand() {
  const args = process.argv.slice(3);
  const yes = args.includes("--yes");
  const id = args.find((a) => !a.startsWith("--"));

  if (!id || !UUID_RE.test(id)) {
    ui.log.error("usage: better-skills delete <uuid> [--yes]");
    process.exit(1);
  }

  const s = ui.spinner();
  s.start("fetching skill");

  let skill: { id: string; name: string; slug: string };
  try {
    skill = await trpc.skills.getById.query({ id });
    s.stop(pc.dim(`found ${skill.name} (${skill.slug})`));
  } catch (error) {
    s.stop(pc.red("fetch failed"));
    ui.log.error(readErrorMessage(error));
    process.exit(1);
  }

  if (!yes) {
    if (isPlain) {
      ui.log.error("non-interactive environment detected, pass --yes to confirm deletion");
      process.exit(1);
    }

    const confirmed = await ui.confirm({
      message: `delete ${pc.bold(skill.name)}? this cannot be undone`,
    });

    if (ui.isCancel(confirmed) || !confirmed) {
      ui.log.info("cancelled");
      return;
    }
  }

  s.start("deleting skill");
  try {
    await trpc.skills.delete.mutate({ id });
    s.stop(pc.green(`deleted ${skill.name}`));
    console.log(`deleted ${skill.slug}`);
  } catch (error) {
    s.stop(pc.red("delete failed"));
    ui.log.error(readErrorMessage(error));
    process.exit(1);
  }
}
