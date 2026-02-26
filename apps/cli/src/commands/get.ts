import * as p from "@clack/prompts";
import pc from "picocolors";

import { readErrorMessage } from "../lib/errors";
import { trpc } from "../lib/trpc";
import { UUID_RE } from "../lib/uuid";

export async function getCommand() {
  const identifier = process.argv[3];

  if (!identifier) {
    p.log.error("usage: better-skills get <slug-or-uuid>");
    process.exit(1);
  }

  const s = p.spinner();
  s.start("fetching skill");

  try {
    const skill = UUID_RE.test(identifier)
      ? await trpc.skills.getById.query({ id: identifier, linkMentions: false })
      : await trpc.skills.getBySlug.query({ slug: identifier, linkMentions: false });

    s.stop(pc.dim(`fetched ${skill.name}`));

    const updated = String(skill.updatedAt).split("T")[0];

    console.log(`\n# ${skill.name}\n`);
    console.log(`id: ${skill.id}`);
    console.log(`slug: ${skill.slug}`);
    console.log(`visibility: ${skill.visibility}`);
    console.log(`updated: ${updated}`);
    console.log(`description: ${skill.description}`);

    if (skill.resources.length > 0) {
      console.log(`resources: ${skill.resources.map((r) => r.path).join(", ")}`);
    }

    console.log(`\n---\n`);
    console.log(skill.renderedMarkdown);
  } catch (error) {
    s.stop(pc.red("fetch failed"));
    p.log.error(readErrorMessage(error));
    process.exit(1);
  }
}
