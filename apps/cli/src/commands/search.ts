import pc from "picocolors";

import { readErrorMessage } from "../lib/errors";
import { trpc } from "../lib/trpc";
import * as ui from "../lib/ui";

const DEFAULT_LIMIT = 5;

export async function searchCommand() {
  const args = process.argv.slice(3);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]!, 10) : DEFAULT_LIMIT;

  const queryArgs = args.filter(
    (a, i) => a !== "--limit" && (limitIdx === -1 || i !== limitIdx + 1),
  );
  const query = queryArgs.join(" ");

  if (!query) {
    ui.log.error("usage: better-skills search <query> [--limit N]");
    process.exit(1);
  }

  if (isNaN(limit) || limit < 1) {
    ui.log.error("--limit must be a positive integer");
    process.exit(1);
  }

  const s = ui.spinner();
  s.start("searching skills");

  try {
    const result = await trpc.skills.search.query({ query, limit });

    if (result.items.length === 0) {
      s.stop(pc.dim(`no skills found matching "${query}"`));
      return;
    }

    s.stop(pc.dim(`found ${result.total} skill(s)`));

    console.log(`\nfound ${result.total} skill(s) matching "${query}":\n`);

    for (let i = 0; i < result.items.length; i++) {
      const item = result.items[i]!;
      const updated = String(item.updatedAt).split("T")[0];
      const pct = Math.round(item.score * 100);

      console.log(`[${i + 1}] ${item.name} (${item.matchType} ${pct}%)`);
      console.log(`    ${item.description}`);
      console.log(`    id: ${item.id} | slug: ${item.slug} | updated: ${updated}`);
      if (item.snippet) {
        console.log(`    snippet: ${item.snippet}`);
      }
      if (i < result.items.length - 1) console.log();
    }
  } catch (error) {
    s.stop(pc.red("search failed"));
    ui.log.error(readErrorMessage(error));
    process.exit(1);
  }
}
