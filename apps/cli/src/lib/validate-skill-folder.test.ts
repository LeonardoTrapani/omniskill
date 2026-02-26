import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { validateSkillFolder } from "./validate-skill-folder";

async function createTempSkillFolder(name: string): Promise<string> {
  return await mkdtemp(join(tmpdir(), `${name}-`));
}

describe("validateSkillFolder", () => {
  test("passes when frontmatter and :new: paths are valid", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-pass");
    await mkdir(join(folder, "references"), { recursive: true });
    await writeFile(join(folder, "references", "guide.md"), "# guide\n", "utf8");
    await writeFile(
      join(folder, "SKILL.md"),
      [
        "---",
        "name: test skill",
        "description: validate",
        "---",
        "",
        "use [[resource:new:references/guide.md]]",
      ].join("\n"),
      "utf8",
    );

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.resourceCount).toBe(1);
    expect(result.newMentionPathCount).toBe(1);
  });

  test("fails when required frontmatter fields are missing", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-frontmatter");
    await writeFile(join(folder, "SKILL.md"), "# no frontmatter\n", "utf8");

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("SKILL.md must start with YAML frontmatter delimited by ---");
  });

  test("ignores :new: mention examples in fenced and inline code", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-code");
    await mkdir(join(folder, "references"), { recursive: true });
    await writeFile(join(folder, "references", "real.md"), "ok\n", "utf8");
    await writeFile(
      join(folder, "SKILL.md"),
      [
        "---",
        "name: test skill",
        "description: validate",
        "---",
        "",
        "```md",
        "[[resource:new:references/example.md]]",
        "```",
        "Inline `[[resource:new:references/example.md]]`",
        "Active [[resource:new:references/real.md]]",
      ].join("\n"),
      "utf8",
    );

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(true);
    expect(result.newMentionPathCount).toBe(1);
  });

  test("warns about resource files not referenced by any mention", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-unreferenced");
    await mkdir(join(folder, "references"), { recursive: true });
    await writeFile(join(folder, "references", "used.md"), "content\n", "utf8");
    await writeFile(join(folder, "references", "orphan.md"), "orphan\n", "utf8");
    await writeFile(
      join(folder, "SKILL.md"),
      [
        "---",
        "name: test skill",
        "description: validate",
        "---",
        "",
        "See [[resource:new:references/used.md]]",
      ].join("\n"),
      "utf8",
    );

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(true);
    expect(result.resourceCount).toBe(2);
    expect(result.newMentionPathCount).toBe(1);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("references/orphan.md");
  });

  test("collects mentions from resource .md files too", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-crossref");
    await mkdir(join(folder, "references"), { recursive: true });
    await writeFile(
      join(folder, "references", "a.md"),
      "read [[resource:new:references/b.md]] first\n",
      "utf8",
    );
    await writeFile(join(folder, "references", "b.md"), "details\n", "utf8");
    await writeFile(
      join(folder, "SKILL.md"),
      [
        "---",
        "name: test skill",
        "description: validate",
        "---",
        "",
        "Start with [[resource:new:references/a.md]]",
      ].join("\n"),
      "utf8",
    );

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(true);
    expect(result.resourceCount).toBe(2);
    expect(result.newMentionPathCount).toBe(2);
    expect(result.warnings).toEqual([]);
  });
});
