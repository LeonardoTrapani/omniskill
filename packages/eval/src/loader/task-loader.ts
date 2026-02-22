import { readdir } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { evalTaskSchema, type EvalTask } from "../types.js";

export async function loadTasksFromDisk(
  tasksDir: string,
  filter?: { domain?: string; skillSlug?: string; tags?: string[] },
): Promise<EvalTask[]> {
  const tasks: EvalTask[] = [];

  let domains: string[];
  try {
    domains = await readdir(tasksDir);
  } catch {
    return [];
  }

  for (const domain of domains) {
    if (filter?.domain && domain !== filter.domain) continue;

    const domainDir = join(tasksDir, domain);
    let taskDirs: string[];
    try {
      taskDirs = await readdir(domainDir);
    } catch {
      continue;
    }

    for (const taskSlug of taskDirs) {
      const taskFile = join(domainDir, taskSlug, "task.yaml");
      try {
        const file = Bun.file(taskFile);
        const content = await file.text();
        const raw = YAML.parse(content);
        const task = evalTaskSchema.parse(raw);

        if (filter?.skillSlug && !task.targetSkillSlugs.includes(filter.skillSlug)) {
          continue;
        }
        if (filter?.tags && filter.tags.length > 0) {
          const taskTags = task.tags ?? [];
          if (!filter.tags.some((t) => taskTags.includes(t))) continue;
        }

        tasks.push(task);
      } catch {
        // Skip invalid task files
      }
    }
  }

  return tasks;
}
