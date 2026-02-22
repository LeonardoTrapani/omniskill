import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import pc from "picocolors";
import { loadTasksFromDisk, runEval, formatCliReport, formatJsonReport } from "@omniscient/eval";

const TASKS_DIR = resolve(import.meta.dirname, "../../../packages/eval/tasks");
const SKILLS_DIR = resolve(import.meta.dirname, "../../../.agents/skills");

async function loadSkillContent(slug: string): Promise<string | null> {
  try {
    const skillFile = join(SKILLS_DIR, slug, "SKILL.md");
    return await Bun.file(skillFile).text();
  } catch {
    return null;
  }
}

async function loadAllSkillSlugs(): Promise<string[]> {
  try {
    const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    console.log(`
${pc.bold("Omniscient Eval CLI")}

${pc.bold("Usage:")}
  bun eval-cli run [options]     Run evaluations
  bun eval-cli tasks [options]   List available tasks
  bun eval-cli help              Show this help

${pc.bold("Run Options:")}
  --skill <slug>     Evaluate specific skill(s) (comma-separated)
  --domain <name>    Filter tasks by domain
  --runs <n>         Number of repetitions per task (default: 1)
  --format <type>    Output format: cli, json (default: cli)
  --output <path>    Write report to file

${pc.bold("Tasks Options:")}
  --domain <name>    Filter by domain
  --skill <slug>     Filter by target skill
`);
    return;
  }

  if (command === "tasks") {
    const domain = getFlag(args, "--domain");
    const skillSlug = getFlag(args, "--skill");

    const tasks = await loadTasksFromDisk(TASKS_DIR, {
      domain: domain ?? undefined,
      skillSlug: skillSlug ?? undefined,
    });

    if (tasks.length === 0) {
      console.log(pc.yellow("No tasks found."));
      return;
    }

    console.log(pc.bold(`\nFound ${tasks.length} eval tasks:\n`));
    for (const task of tasks) {
      const difficulty =
        task.difficulty === "easy"
          ? pc.green(task.difficulty)
          : task.difficulty === "medium"
            ? pc.yellow(task.difficulty)
            : pc.red(task.difficulty);
      console.log(`  ${pc.cyan(task.id)} ${pc.bold(task.name)}`);
      console.log(
        `    Domain: ${task.domain} | Difficulty: ${difficulty} | Skills: ${task.targetSkillSlugs.join(", ")}`,
      );
    }
    return;
  }

  if (command === "run") {
    const skillFilter = getFlag(args, "--skill");
    const domain = getFlag(args, "--domain");
    const runs = Number.parseInt(getFlag(args, "--runs") ?? "1", 10);
    const format = getFlag(args, "--format") ?? "cli";
    const output = getFlag(args, "--output");

    console.log(pc.bold("\nOmniscient Skill Eval Runner"));
    console.log("=".repeat(50));

    // Load tasks
    const tasks = await loadTasksFromDisk(TASKS_DIR, {
      domain: domain ?? undefined,
      skillSlug: skillFilter ?? undefined,
    });

    if (tasks.length === 0) {
      console.log(pc.red("No matching tasks found."));
      return;
    }

    console.log(`Tasks: ${pc.cyan(String(tasks.length))}`);
    console.log(`Runs per task: ${pc.cyan(String(runs))}`);

    // Collect required skill slugs
    const requiredSlugs = new Set<string>();
    for (const task of tasks) {
      for (const slug of task.targetSkillSlugs) {
        if (!skillFilter || skillFilter.split(",").includes(slug)) {
          requiredSlugs.add(slug);
        }
      }
    }

    // Load skill contents
    const skillContents = new Map<string, string>();
    for (const slug of requiredSlugs) {
      const content = await loadSkillContent(slug);
      if (content) {
        skillContents.set(slug, content);
        console.log(`Loaded skill: ${pc.green(slug)}`);
      } else {
        console.log(`${pc.yellow("Warning")}: Skill not found: ${slug}`);
      }
    }

    if (skillContents.size === 0) {
      console.log(pc.red("No skills could be loaded."));
      return;
    }

    console.log(`\nStarting evaluation...\n`);

    // Run eval
    const report = await runEval({
      tasks,
      skillContents,
      runs,
      tasksDir: TASKS_DIR,
    });

    // Output report
    if (format === "json") {
      const jsonOutput = formatJsonReport(report);
      if (output) {
        await Bun.write(output, jsonOutput);
        console.log(`\nReport written to: ${pc.cyan(output)}`);
      } else {
        console.log(jsonOutput);
      }
    } else {
      const cliOutput = formatCliReport(report);
      console.log("\n" + cliOutput);
      if (output) {
        await Bun.write(output, cliOutput);
        console.log(`\nReport written to: ${pc.cyan(output)}`);
      }
    }

    return;
  }

  console.log(pc.red(`Unknown command: ${command}`));
  console.log("Run 'bun eval-cli help' for usage information.");
}

function getFlag(args: string[], flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1]!;
}

main().catch((e) => {
  console.error(pc.red("Fatal error:"), e);
  process.exit(1);
});
