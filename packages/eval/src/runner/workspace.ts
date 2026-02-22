import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Workspace {
  dir: string;
  cleanup: () => Promise<void>;
}

export async function createWorkspace(
  scaffold?: Record<string, string>,
  skillContent?: { slug: string; markdown: string } | null,
): Promise<Workspace> {
  const dir = await mkdtemp(join(tmpdir(), "omniscient-eval-"));

  // Write scaffold files
  if (scaffold) {
    for (const [filePath, content] of Object.entries(scaffold)) {
      const fullPath = join(dir, filePath);
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      await Bun.write(fullPath, content);
    }
  }

  // Write skill files for treatment condition
  if (skillContent) {
    const skillDir = join(dir, ".agents", "skills", skillContent.slug);
    await Bun.write(join(skillDir, "SKILL.md"), skillContent.markdown);
  }

  return {
    dir,
    cleanup: async () => {
      try {
        await rm(dir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}
