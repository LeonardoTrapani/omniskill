import * as p from "@clack/prompts";

import { configCommand } from "./commands/config";
import { createCommand } from "./commands/create";
import { getCommand } from "./commands/get";
import { importCommand } from "./commands/import";
import { healthCommand } from "./commands/health";
import { loginCommand } from "./commands/login";
import { logoutCommand } from "./commands/logout";
import { searchCommand } from "./commands/search";
import { syncCommand } from "./commands/sync";
import { whoamiCommand } from "./commands/whoami";

class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

function printUsage() {
  p.log.info("usage:");
  p.log.info("  omniscient health");
  p.log.info("  omniscient login");
  p.log.info("  omniscient logout");
  p.log.info("  omniscient whoami");
  p.log.info("  omniscient sync");
  p.log.info("  omniscient search <query> [--public] [--limit N]");
  p.log.info("  omniscient get <slug-or-uuid>");
  p.log.info("  omniscient config");
  p.log.info("  omniscient create --from <dir> [--slug <s>] [--public]");
  p.log.info("  omniscient import <slug-or-uuid> [--slug <new-slug>]");
}

async function run(args: string[]) {
  if (args.length === 0) {
    printUsage();
    return;
  }

  switch (args[0]) {
    case "health":
      await healthCommand();
      return;
    case "login":
      await loginCommand();
      return;
    case "logout":
      await logoutCommand();
      return;
    case "whoami":
      await whoamiCommand();
      return;
    case "sync":
      await syncCommand();
      return;
    case "search":
      await searchCommand();
      return;
    case "get":
      await getCommand();
      return;
    case "config":
      await configCommand();
      return;
    case "create":
      await createCommand();
      return;
    case "import":
      await importCommand();
      return;
    default:
      throw new UsageError(`unknown command: ${args[0]}`);
  }
}

async function main() {
  try {
    await run(process.argv.slice(2));
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));

    if (error instanceof UsageError) {
      printUsage();
    }

    process.exit(1);
  }
}

main();
