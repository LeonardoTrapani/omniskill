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
    expect(result.mentionCount).toBe(1);
  });

  test("fails when required frontmatter fields are missing", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-frontmatter");
    await writeFile(join(folder, "SKILL.md"), "# no frontmatter\n", "utf8");

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("SKILL.md must start with YAML frontmatter delimited by ---");
  });

  test("ignores backslash-escaped :new: mentions", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-escaped");
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
        "Escaped \\[[resource:new:references/example.md]]",
        "Active [[resource:new:references/real.md]]",
      ].join("\n"),
      "utf8",
    );

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(true);
    expect(result.mentionCount).toBe(1);
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
    expect(result.mentionCount).toBe(1);
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
    expect(result.mentionCount).toBe(2);
    expect(result.warnings).toEqual([]);
  });

  test("counts [[resource:<uuid>]] mentions as coverage", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-uuid");
    await mkdir(join(folder, "references"), { recursive: true });
    await writeFile(join(folder, "references", "guide.md"), "# guide\n", "utf8");
    await writeFile(join(folder, "references", "faq.md"), "# faq\n", "utf8");
    await writeFile(
      join(folder, "SKILL.md"),
      [
        "---",
        "name: test skill",
        "description: validate",
        "---",
        "",
        "- [[resource:a1b2c3d4-e5f6-7890-abcd-ef1234567890]]",
        "- [[resource:b2c3d4e5-f6a7-8901-bcde-f12345678901]]",
      ].join("\n"),
      "utf8",
    );

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(true);
    expect(result.resourceCount).toBe(2);
    expect(result.mentionCount).toBe(2);
    expect(result.warnings).toEqual([]);
  });

  test("warns when uuid mentions don't cover all resources", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-uuid-partial");
    await mkdir(join(folder, "references"), { recursive: true });
    await writeFile(join(folder, "references", "a.md"), "a\n", "utf8");
    await writeFile(join(folder, "references", "b.md"), "b\n", "utf8");
    await writeFile(join(folder, "references", "c.md"), "c\n", "utf8");
    await writeFile(
      join(folder, "SKILL.md"),
      [
        "---",
        "name: test skill",
        "description: validate",
        "---",
        "",
        "- [[resource:a1b2c3d4-e5f6-7890-abcd-ef1234567890]]",
      ].join("\n"),
      "utf8",
    );

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(true);
    expect(result.resourceCount).toBe(3);
    expect(result.mentionCount).toBe(1);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("2 resource file(s) not referenced");
  });

  test("excludes external uuid mentions when .resource-ids.json is present", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-external");
    await mkdir(join(folder, "references"), { recursive: true });
    await writeFile(join(folder, "references", "mine.md"), "local\n", "utf8");

    const internalId = "aaaa1111-bbbb-cccc-dddd-eeee22223333";
    const externalId = "ffff4444-5555-6666-7777-888899990000";

    await writeFile(
      join(folder, ".resource-ids.json"),
      JSON.stringify({ [internalId]: "references/mine.md" }),
      "utf8",
    );
    await writeFile(
      join(folder, "SKILL.md"),
      [
        "---",
        "name: test skill",
        "description: validate",
        "---",
        "",
        `- [[resource:${internalId}]]`,
        `- [[resource:${externalId}]]`,
      ].join("\n"),
      "utf8",
    );

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(true);
    expect(result.resourceCount).toBe(1);
    // only the internal uuid should count; the external one is skipped
    expect(result.mentionCount).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  test("counts mixed :new: and uuid mentions together", async () => {
    const folder = await createTempSkillFolder("better-skills-validate-mixed");
    await mkdir(join(folder, "references"), { recursive: true });
    await writeFile(join(folder, "references", "new-file.md"), "new\n", "utf8");
    await writeFile(join(folder, "references", "existing.md"), "existing\n", "utf8");
    await writeFile(
      join(folder, "SKILL.md"),
      [
        "---",
        "name: test skill",
        "description: validate",
        "---",
        "",
        "- [[resource:new:references/new-file.md]]",
        "- [[resource:a1b2c3d4-e5f6-7890-abcd-ef1234567890]]",
      ].join("\n"),
      "utf8",
    );

    const result = await validateSkillFolder(folder);

    expect(result.ok).toBe(true);
    expect(result.resourceCount).toBe(2);
    expect(result.mentionCount).toBe(2);
    expect(result.warnings).toEqual([]);
  });
});
