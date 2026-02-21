import * as p from "@clack/prompts";
import pc from "picocolors";

import { trpc } from "../lib/trpc";

export async function skillsListCommand() {
  const s = p.spinner();
  s.start("fetching skills");

  try {
    const result = await trpc.skills.list.query({ limit: 10 });

    if (result.items.length === 0) {
      s.stop(pc.dim("no skills found"));
      return;
    }

    s.stop(pc.green(`found ${result.items.length} skill(s)`));

    for (const skill of result.items) {
      p.log.info(`${pc.bold(skill.name)} ${pc.dim(`(${skill.slug})`)} — ${skill.description}`);
    }

    if (result.nextCursor) {
      p.log.info(pc.dim("more results available"));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    s.stop(pc.red(`failed to fetch skills: ${message}`));
  }
}
