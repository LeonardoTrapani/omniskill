import * as p from "@clack/prompts";
import pc from "picocolors";

import {
  buildUpdateResourcesPayload,
  loadLocalSkillDraft,
  readErrorMessage,
  resolveNewResourceMentions,
} from "../lib/skill-io";
import { trpc } from "../lib/trpc";
import { UUID_RE } from "../lib/uuid";

function parseArgs(argv: string[]) {
  const args = argv.slice(3);
  let identifier: string | undefined;
  let from: string | undefined;
  let slug: string | undefined;
  let visibility: "public" | "private" | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (!arg.startsWith("--") && !identifier) {
      identifier = arg;
      continue;
    }

    if (arg === "--from" && args[i + 1]) {
      from = args[++i];
      continue;
    }

    if (arg === "--slug" && args[i + 1]) {
      slug = args[++i];
      continue;
    }

    if (arg === "--public") {
      visibility = "public";
      continue;
    }

    if (arg === "--private") {
      visibility = "private";
      continue;
    }
  }

  return { identifier, from, slug, visibility };
}

export async function updateCommand() {
  const { identifier, from, slug, visibility: visibilityOverride } = parseArgs(process.argv);

  if (!identifier || !from) {
    p.log.error(
      "usage: better-skills update <slug-or-uuid> --from <dir> [--slug <s>] [--public|--private]",
    );
    process.exit(1);
  }

  let draft;
  try {
    draft = await loadLocalSkillDraft(from);
  } catch (error) {
    p.log.error(readErrorMessage(error));
    process.exit(1);
  }

  const s = p.spinner();
  s.start("loading skill");

  let targetSkill: Awaited<ReturnType<typeof trpc.skills.getById.query>>;
  try {
    targetSkill = UUID_RE.test(identifier)
      ? await trpc.skills.getById.query({ id: identifier, linkMentions: false })
      : await trpc.skills.getBySlug.query({ slug: identifier, linkMentions: false });
    s.stop(pc.dim(`loaded ${targetSkill.slug}`));
  } catch (error) {
    s.stop(pc.red("load failed"));
    p.log.error(readErrorMessage(error));
    process.exit(1);
  }

  const visibility = visibilityOverride ?? targetSkill.visibility;
  const resourcesPayload = buildUpdateResourcesPayload(targetSkill.resources, draft.resources);

  s.start("updating skill");

  let updatedSkill: Awaited<ReturnType<typeof trpc.skills.update.mutate>> | null = null;

  try {
    updatedSkill = await trpc.skills.update.mutate({
      id: targetSkill.id,
      slug,
      name: draft.name,
      description: draft.description,
      skillMarkdown: draft.markdownForMutation,
      visibility,
      frontmatter: draft.frontmatter,
      resources: resourcesPayload,
    });

    if (draft.newResourcePaths.length > 0) {
      s.message("resolving local new resource mentions");
      const resolved = await resolveNewResourceMentions(
        updatedSkill.id,
        draft,
        updatedSkill.resources,
      );
      if (resolved) updatedSkill = resolved;
    }

    s.stop(pc.green("skill updated"));

    console.log(
      JSON.stringify({
        id: updatedSkill.id,
        slug: updatedSkill.slug,
        name: updatedSkill.name,
        visibility: updatedSkill.visibility,
      }),
    );
  } catch (error) {
    s.stop(pc.red("update failed"));

    if (updatedSkill) {
      p.log.error(`skill was updated but finalization failed: ${updatedSkill.id}`);
    }

    p.log.error(readErrorMessage(error));
    process.exit(1);
  }
}
