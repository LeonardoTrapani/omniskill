import pc from "picocolors";

import { readErrorMessage } from "../lib/errors";
import { trpc } from "../lib/trpc";
import * as ui from "../lib/ui";

const DEFAULT_LIMIT = 20;

export async function listCommand() {
  const args = process.argv.slice(3);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]!, 10) : DEFAULT_LIMIT;
  const showAll = args.includes("--all");

  const searchArgs = args.filter(
    (a, i) => a !== "--all" && a !== "--limit" && (limitIdx === -1 || i !== limitIdx + 1),
  );
  const search = searchArgs.join(" ") || undefined;

  if (isNaN(limit) || limit < 1) {
    ui.log.error("--limit must be a positive integer");
    process.exit(1);
  }

  const s = ui.spinner();
  s.start("loading skills");

  try {
    const items: Array<{
      id: string;
      slug: string;
      name: string;
      description: string;
      updatedAt: string;
    }> = [];

    let cursor: string | undefined;

    // paginate through all results
    while (true) {
      const page = await trpc.skills.list.query({
        search,
        limit: showAll ? 100 : Math.min(limit - items.length, 100),
        cursor,
      });

      items.push(...page.items);

      if (!page.nextCursor || (!showAll && items.length >= limit)) break;
      cursor = page.nextCursor;
    }

    if (items.length === 0) {
      s.stop(pc.dim(search ? `no skills matching "${search}"` : "no skills found"));
      return;
    }

    s.stop(pc.dim(`${items.length} skill(s)`));

    console.log(`\n${items.length} skill(s)${search ? ` matching "${search}"` : ""}:\n`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const updated = String(item.updatedAt).split("T")[0];

      console.log(`[${i + 1}] ${item.name}`);
      console.log(`    ${item.description}`);
      console.log(`    id: ${item.id} | slug: ${item.slug} | updated: ${updated}`);
      if (i < items.length - 1) console.log();
    }
  } catch (error) {
    s.stop(pc.red("list failed"));
    ui.log.error(readErrorMessage(error));
    process.exit(1);
  }
}
