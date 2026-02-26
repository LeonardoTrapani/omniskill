import * as p from "@clack/prompts";
import pc from "picocolors";

import {
  loadLocalSkillDraft,
  readErrorMessage,
  resolveNewResourceMentions,
  slugify,
} from "../lib/skill-io";
import { trpc } from "../lib/trpc";

function parseArgs(argv: string[]) {
  const args = argv.slice(3);
  let from: string | undefined;
  let slug: string | undefined;
  let isPublic = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--public") {
      isPublic = true;
    } else if (arg === "--from" && args[i + 1]) {
      from = args[++i];
    } else if (arg === "--slug" && args[i + 1]) {
      slug = args[++i];
    }
  }

  return { from, slug, isPublic };
}

export async function createCommand() {
  const { from, slug: slugOverride, isPublic } = parseArgs(process.argv);

  if (!from) {
    p.log.error("usage: better-skills create --from <dir> [--slug <s>] [--public]");
    process.exit(1);
  }

  let draft;
  try {
    draft = await loadLocalSkillDraft(from);
  } catch (error) {
    p.log.error(readErrorMessage(error));
    process.exit(1);
  }

  const slug =
    slugOverride ||
    (typeof draft.frontmatter.slug === "string" ? draft.frontmatter.slug : null) ||
    slugify(draft.name);
  const visibility = isPublic ? ("public" as const) : ("private" as const);

  const s = p.spinner();
  s.start("creating skill");

  let createdSkill: Awaited<ReturnType<typeof trpc.skills.create.mutate>> | null = null;

  try {
    createdSkill = await trpc.skills.create.mutate({
      slug,
      name: draft.name,
      description: draft.description,
      skillMarkdown: draft.markdownForMutation,
      visibility,
      frontmatter: draft.frontmatter,
      resources: draft.resources,
    });

    if (draft.newResourcePaths.length > 0) {
      s.message("resolving local new resource mentions");
      const resolved = await resolveNewResourceMentions(
        createdSkill.id,
        draft,
        createdSkill.resources,
      );
      if (resolved) createdSkill = resolved;
    }

    s.stop(pc.green("skill created"));

    console.log(
      JSON.stringify({
        id: createdSkill.id,
        slug: createdSkill.slug,
        name: createdSkill.name,
        visibility: createdSkill.visibility,
      }),
    );
  } catch (error) {
    s.stop(pc.red("creation failed"));

    if (createdSkill) {
      p.log.error(`skill was created but finalization failed: ${createdSkill.id}`);
    }

    p.log.error(readErrorMessage(error));
    process.exit(1);
  }
}
