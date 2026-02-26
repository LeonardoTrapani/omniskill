import { backupCommand } from "./commands/backup";
import { cloneCommand } from "./commands/clone";
import { configCommand } from "./commands/config";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { getCommand } from "./commands/get";
import { importCommand } from "./commands/import";
import { healthCommand } from "./commands/health";
import { listCommand } from "./commands/list";
import { loginCommand } from "./commands/login";
import { logoutCommand } from "./commands/logout";
import { searchCommand } from "./commands/search";
import { syncCommand } from "./commands/sync";
import { updateCommand } from "./commands/update";
import { validateCommand } from "./commands/validate";
import { whoamiCommand } from "./commands/whoami";
import { readErrorMessage } from "./lib/errors";
import * as ui from "./lib/ui";
import { getCliVersion } from "./lib/version";

class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

function printUsage() {
  ui.log.info("usage:");
  ui.log.info("  better-skills --version");
  ui.log.info("  better-skills --help");
  ui.log.info("  better-skills health");
  ui.log.info("  better-skills login");
  ui.log.info("  better-skills logout");
  ui.log.info("  better-skills whoami");
  ui.log.info("  better-skills sync");
  ui.log.info("  better-skills validate <dir>");
  ui.log.info("  better-skills backup plan [--source <dir>] [--out <file>] [--agent <agent>]...");
  ui.log.info("  better-skills backup apply --plan <file> [--keep-snapshot]");
  ui.log.info("  better-skills list [search] [--all] [--limit N]");
  ui.log.info("  better-skills search <query> [--public] [--limit N]");
  ui.log.info("  better-skills get <slug-or-uuid>");
  ui.log.info("  better-skills clone <slug-or-uuid> [--to <dir>] [--force]");
  ui.log.info("  better-skills config");
  ui.log.info("  better-skills create --from <dir> [--slug <s>] [--public]");
  ui.log.info(
    "  better-skills update <slug-or-uuid> --from <dir> [--slug <s>] [--public|--private]",
  );
  ui.log.info("  better-skills delete <uuid> [--yes]");
  ui.log.info("  better-skills import <slug-or-uuid> [--slug <new-slug>]");
}

function printVersion() {
  ui.log.info(`better-skills ${getCliVersion()}`);
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
    case "list":
      await listCommand();
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
    ui.log.error(readErrorMessage(error));

    if (error instanceof UsageError) {
      printUsage();
    }

    process.exit(1);
  }
}

main();
