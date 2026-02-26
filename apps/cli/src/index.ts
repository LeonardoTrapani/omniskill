import * as p from "@clack/prompts";

import { backupCommand } from "./commands/backup";
import { cloneCommand } from "./commands/clone";
import { configCommand } from "./commands/config";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { getCommand } from "./commands/get";
import { importCommand } from "./commands/import";
import { healthCommand } from "./commands/health";
import { loginCommand } from "./commands/login";
import { logoutCommand } from "./commands/logout";
import { searchCommand } from "./commands/search";
import { syncCommand } from "./commands/sync";
import { updateCommand } from "./commands/update";
import { validateCommand } from "./commands/validate";
import { whoamiCommand } from "./commands/whoami";
import { readErrorMessage } from "./lib/errors";
import { getCliVersion } from "./lib/version";

class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

function printUsage() {
  p.log.info("usage:");
  p.log.info("  better-skills --version");
  p.log.info("  better-skills --help");
  p.log.info("  better-skills health");
  p.log.info("  better-skills login");
  p.log.info("  better-skills logout");
  p.log.info("  better-skills whoami");
  p.log.info("  better-skills sync");
  p.log.info("  better-skills validate <dir>");
  p.log.info("  better-skills backup plan [--source <dir>] [--out <file>] [--agent <agent>]...");
  p.log.info("  better-skills backup apply --plan <file> [--keep-snapshot]");
  p.log.info("  better-skills search <query> [--public] [--limit N]");
  p.log.info("  better-skills get <slug-or-uuid>");
  p.log.info("  better-skills clone <slug-or-uuid> [--to <dir>] [--force]");
  p.log.info("  better-skills config");
  p.log.info("  better-skills create --from <dir> [--slug <s>] [--public]");
  p.log.info(
    "  better-skills update <slug-or-uuid> --from <dir> [--slug <s>] [--public|--private]",
  );
  p.log.info("  better-skills delete <uuid>");
  p.log.info("  better-skills import <slug-or-uuid> [--slug <new-slug>]");
}

function printVersion() {
  p.log.info(`better-skills ${getCliVersion()}`);
}

async function run(args: string[]) {
  const firstArg = args[0];

  if (!firstArg || firstArg === "--help" || firstArg === "-h" || firstArg === "help") {
    printUsage();
    return;
  }

  if (firstArg === "--version" || firstArg === "-v" || firstArg === "version") {
    printVersion();
    return;
  }

  switch (firstArg) {
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
    case "validate":
      await validateCommand();
      return;
    case "backup":
      await backupCommand();
      return;
    case "search":
      await searchCommand();
      return;
    case "get":
      await getCommand();
      return;
    case "clone":
      await cloneCommand();
      return;
    case "config":
      await configCommand();
      return;
    case "create":
      await createCommand();
      return;
    case "update":
      await updateCommand();
      return;
    case "delete":
      await deleteCommand();
      return;
    case "import":
      await importCommand();
      return;
    default:
      throw new UsageError(`unknown command: ${firstArg}`);
  }
}

async function main() {
  try {
    await run(process.argv.slice(2));
  } catch (error) {
    p.log.error(readErrorMessage(error));

    if (error instanceof UsageError) {
      printUsage();
    }

    process.exit(1);
  }
}

main();
