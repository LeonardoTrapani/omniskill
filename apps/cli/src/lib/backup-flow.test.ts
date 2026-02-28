import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { copyLocalSkillsToBackupTmp } from "./backup-flow";

async function createSkillFolder(path: string, name: string) {
  await mkdir(path, { recursive: true });
  await writeFile(
    join(path, "SKILL.md"),
    ["---", `name: ${name}`, "description: backup test", "---", "", "body"].join("\n"),
    "utf8",
  );
}

describe("copyLocalSkillsToBackupTmp", () => {
  test("returns empty result for nonexistent source", async () => {
    const result = await copyLocalSkillsToBackupTmp({
      sourceDir: "/tmp/does-not-exist-backup-test",
    });

    expect(result.copiedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  test("discovers skill folders recursively from custom source", async () => {
    const sourceDir = await mkdtemp(join(tmpdir(), "better-skills-backup-source-"));
    const outputDir = await mkdtemp(join(tmpdir(), "better-skills-backup-output-"));

    try {
      const nestedSkill = join(sourceDir, "group", "nested-skill");
      const deepSkill = join(sourceDir, "group", "deeper", "deep-skill");

      await createSkillFolder(nestedSkill, "nested-skill");
      await createSkillFolder(deepSkill, "deep-skill");
      await mkdir(join(nestedSkill, "references"), { recursive: true });
      await writeFile(join(nestedSkill, "references", "guide.md"), "guide\n", "utf8");

      const result = await copyLocalSkillsToBackupTmp({ sourceDir, outputDir });

      expect(result.discoveredCount).toBe(2);
      expect(result.copiedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.items.map((item) => item.sourcePath).toSorted()).toEqual(
        [nestedSkill, deepSkill].toSorted(),
      );

      const nestedItem = result.items.find((item) => item.sourcePath === nestedSkill);
      expect(nestedItem).toBeDefined();

      const copiedGuide = await readFile(
        join(nestedItem!.rawPath, "references", "guide.md"),
        "utf8",
      );
      expect(copiedGuide).toBe("guide\n");
    } finally {
      await rm(sourceDir, { recursive: true, force: true });
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  test("includes source root skill and nested skills", async () => {
    const sourceDir = await mkdtemp(join(tmpdir(), "better-skills-backup-source-root-"));
    const outputDir = await mkdtemp(join(tmpdir(), "better-skills-backup-output-root-"));

    try {
      const childSkill = join(sourceDir, "nested", "child-skill");

      await createSkillFolder(sourceDir, "root-skill");
      await createSkillFolder(childSkill, "child-skill");

      const result = await copyLocalSkillsToBackupTmp({ sourceDir, outputDir });

      expect(result.discoveredCount).toBe(2);
      expect(result.copiedCount).toBe(2);
      expect(result.items.map((item) => item.sourcePath).toSorted()).toEqual(
        [sourceDir, childSkill].toSorted(),
      );
    } finally {
      await rm(sourceDir, { recursive: true, force: true });
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
