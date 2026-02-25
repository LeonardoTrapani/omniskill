import * as p from "@clack/prompts";
import pc from "picocolors";

import { trpc } from "../lib/trpc";

const DEFAULT_LIMIT = 5;

export async function searchCommand() {
  const args = process.argv.slice(3);
  const isPublic = args.includes("--public");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]!, 10) : DEFAULT_LIMIT;

  const queryArgs = args.filter(
    (a, i) => a !== "--public" && a !== "--limit" && (limitIdx === -1 || i !== limitIdx + 1),
  );
  const query = queryArgs.join(" ");

  if (!query) {
    p.log.error("usage: omniscient search <query> [--public] [--limit N]");
    process.exit(1);
  }

  if (isNaN(limit) || limit < 1) {
    p.log.error("--limit must be a positive integer");
    process.exit(1);
  }

  const s = p.spinner();
  s.start("searching skills");

  try {
    const scope = isPublic ? "all" : "own";
    const result = await trpc.skills.search.query({ query, scope, limit });

    if (result.items.length === 0) {
      s.stop(pc.dim(`no skills found matching "${query}"`));
      return;
    }

    s.stop(pc.dim(`found ${result.total} skill(s)`));

    console.log(`\nfound ${result.total} skill(s) matching "${query}" (scope: ${scope}):\n`);

    for (let i = 0; i < result.items.length; i++) {
      const item = result.items[i]!;
      const updated = String(item.updatedAt).split("T")[0];
      const pct = Math.round(item.score * 100);

      console.log(`[${i + 1}] ${item.name} (${item.matchType} ${pct}%)`);
      console.log(`    ${item.description}`);
      console.log(
        `    id: ${item.id} | slug: ${item.slug} | visibility: ${item.visibility} | updated: ${updated}`,
      );
      if (item.snippet) {
        console.log(`    snippet: ${item.snippet}`);
      }
      if (i < result.items.length - 1) console.log();
    }
  } catch (error) {
    s.stop(pc.red("search failed"));
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(message);
    process.exit(1);
  }
}
