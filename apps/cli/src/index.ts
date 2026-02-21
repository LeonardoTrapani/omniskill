import * as p from "@clack/prompts";
import pc from "picocolors";

import { healthCommand } from "./commands/health";
import { skillsInstallCommand, skillsListCommand, skillsSyncCommand } from "./commands/skills";
import { whoamiCommand } from "./commands/whoami";
import { supportedAgents } from "./lib/agents";

function parseNumberFlag(value: string, flagName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer`);
  }

  return parsed;
}

function parseVisibilityFlag(value: string): "public" | "private" {
  if (value === "public" || value === "private") {
    return value;
  }

  throw new Error("--visibility must be one of: public, private");
}

function printUsage() {
  p.log.info("usage:");
  p.log.info("  omniscient health");
  p.log.info("  omniscient whoami");
  p.log.info(
    "  omniscient skills list [--search <query>] [--limit <n>] [--visibility public|private]",
  );
  p.log.info("  omniscient skills install <slug>");
  p.log.info("  omniscient skills install");
  p.log.info("  omniscient skills sync");
  p.log.info("  (always installs to all supported agents)");
  p.log.info(`supported agents: ${supportedAgents.join(", ")}`);
}

function parseSkillsListArgs(args: string[]) {
  const output: {
    limit?: number;
    search?: string;
    visibility?: "public" | "private";
  } = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (arg === "--search") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("missing value for --search");
      }
      output.search = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--search=")) {
      output.search = arg.slice("--search=".length);
      continue;
    }

    if (arg === "--limit") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("missing value for --limit");
      }
      output.limit = parseNumberFlag(value, "--limit");
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      output.limit = parseNumberFlag(arg.slice("--limit=".length), "--limit");
      continue;
    }

    if (arg === "--visibility") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("missing value for --visibility");
      }
      output.visibility = parseVisibilityFlag(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--visibility=")) {
      output.visibility = parseVisibilityFlag(arg.slice("--visibility=".length));
      continue;
    }

    throw new Error(`unknown flag for skills list: ${arg}`);
  }

  return output;
}

function parseSkillsInstallArgs(args: string[]) {
  let slug: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`unknown flag for skills install: ${arg}`);
    }

    if (!slug) {
      slug = arg;
      continue;
    }

    throw new Error(`unexpected argument: ${arg}`);
  }

  return { slug };
}

async function runSkillsCommand(args: string[]) {
  if (args.length === 0 || args[0] === "list") {
    const parsed = parseSkillsListArgs(args[0] === "list" ? args.slice(1) : args);
    await skillsListCommand(parsed);
    return;
  }

  if (args[0] === "install") {
    const parsed = parseSkillsInstallArgs(args.slice(1));
    await skillsInstallCommand({
      slug: parsed.slug,
    });
    return;
  }

  if (args[0] === "sync") {
    if (args.length > 1) {
      throw new Error(`unexpected argument for skills sync: ${args[1]}`);
    }

    await skillsSyncCommand();
    return;
  }

  throw new Error(`unknown skills subcommand: ${args[0]}`);
}

async function runFromArgs(args: string[]): Promise<boolean> {
  if (args.length === 0) {
    return false;
  }

  if (args[0] === "health") {
    await healthCommand();
    return true;
  }

  if (args[0] === "whoami") {
    await whoamiCommand();
    return true;
  }

  if (args[0] === "skills") {
    await runSkillsCommand(args.slice(1));
    return true;
  }

  throw new Error(`unknown command: ${args[0]}`);
}

async function runInteractiveMenu() {
  p.intro(pc.bgCyan(pc.black(" omniscient ")));

  const action = await p.select({
    message: "what would you like to do?",
    options: [
      { value: "health", label: "health check", hint: "ping the API server" },
      { value: "whoami", label: "who am i", hint: "check current session" },
      { value: "skills-list", label: "list skills", hint: "browse skills" },
      { value: "skills-install", label: "install skill", hint: "install from list" },
      {
        value: "skills-sync",
        label: "sync private skills",
        hint: "install all your private skills",
      },
    ],
  });

  if (p.isCancel(action)) {
    p.cancel("cancelled");
    process.exit(0);
  }

  switch (action) {
    case "health":
      await healthCommand();
      break;
    case "whoami":
      await whoamiCommand();
      break;
    case "skills-list":
      await skillsListCommand();
      break;
    case "skills-install":
      await skillsInstallCommand();
      break;
    case "skills-sync":
      await skillsSyncCommand();
      break;
  }

  p.outro(pc.dim("done"));
}

async function main() {
  try {
    const handled = await runFromArgs(process.argv.slice(2));
    if (handled) {
      return;
    }

    await runInteractiveMenu();
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    printUsage();
    process.exit(1);
  }
}

main();
