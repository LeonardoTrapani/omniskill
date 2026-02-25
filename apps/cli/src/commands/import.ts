import * as p from "@clack/prompts";
import pc from "picocolors";

import { trpc } from "../lib/trpc";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseArgs(argv: string[]) {
  const args = argv.slice(3);
  let slug: string | undefined;
  let identifier: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--slug" && args[i + 1]) {
      slug = args[++i];
    } else if (!arg.startsWith("--") && !identifier) {
      identifier = arg;
    }
  }

  return { identifier, slug };
}

export async function importCommand() {
  const { identifier, slug: slugOverride } = parseArgs(process.argv);

  if (!identifier) {
    p.log.error("usage: omniskill import <slug-or-uuid> [--slug <new-slug>]");
    process.exit(1);
  }

  const s = p.spinner();

  // resolve slug to UUID if needed
  let skillId: string;

  if (UUID_RE.test(identifier)) {
    skillId = identifier;
  } else {
    s.start("resolving skill");
    try {
      const found = await trpc.skills.getBySlug.query({ slug: identifier });
      skillId = found.id;
      s.stop(pc.dim(`found ${found.name}`));
    } catch (error) {
      s.stop(pc.red("not found"));
      const message = error instanceof Error ? error.message : String(error);
      p.log.error(message);
      process.exit(1);
    }
  }

  s.start("duplicating skill");

  try {
    const created = await trpc.skills.duplicate.mutate({
      id: skillId,
      ...(slugOverride ? { slug: slugOverride } : {}),
    });

    s.stop(pc.green("imported"));

    console.log(
      JSON.stringify({
        id: created.id,
        slug: created.slug,
        name: created.name,
        visibility: created.visibility,
      }),
    );
  } catch (error) {
    s.stop(pc.red("import failed"));
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(message);
    process.exit(1);
  }
}
