import * as p from "@clack/prompts";
import pc from "picocolors";

import { trpc } from "../lib/trpc";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteCommand() {
  const id = process.argv[3];

  if (!id || !UUID_RE.test(id)) {
    p.log.error("usage: omniskill delete <uuid>");
    process.exit(1);
  }

  const s = p.spinner();
  s.start("fetching skill");

  let skill: { id: string; name: string; slug: string };
  try {
    skill = await trpc.skills.getById.query({ id });
    s.stop(pc.dim(`found ${skill.name} (${skill.slug})`));
  } catch (error) {
    s.stop(pc.red("fetch failed"));
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(message);
    process.exit(1);
  }

  const confirmed = await p.confirm({
    message: `delete ${pc.bold(skill.name)}? this cannot be undone`,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.log.info("cancelled");
    return;
  }

  s.start("deleting skill");
  try {
    await trpc.skills.delete.mutate({ id });
    s.stop(pc.green(`deleted ${skill.name}`));
  } catch (error) {
    s.stop(pc.red("delete failed"));
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(message);
    process.exit(1);
  }
}
