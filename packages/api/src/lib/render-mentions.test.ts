import { beforeEach, describe, expect, mock, test } from "bun:test";

const SKILL_A_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const SKILL_B_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
const RESOURCE_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012";
const UNKNOWN_SKILL_ID = "d4e5f6a7-b8c9-0123-defa-234567890123";
const UNKNOWN_RESOURCE_ID = "e5f6a7b8-c9d0-1234-efab-345678901234";

const mockSkills = [
  { id: SKILL_A_ID, slug: "typescript-basics", name: "TypeScript Basics" },
  { id: SKILL_B_ID, slug: "react-patterns", name: "React Patterns" },
];

const mockResources = [{ id: RESOURCE_ID, path: "examples/hooks.ts", skillId: SKILL_A_ID }];

let queryCount = 0;

const drizzleNameSym = Symbol.for("drizzle:Name");

mock.module("@omniskill/db", () => {
  const makeResult = (rows: unknown[]) => ({
    execute: () => Promise.resolve(rows),
  });

  const makeSelectChain = () => ({
    from: (table: unknown) => {
      const tableName =
        table && typeof table === "object" && drizzleNameSym in table
          ? (table as Record<symbol, string>)[drizzleNameSym]
          : "unknown";

      const rowsForBaseTable = () => {
        if (tableName === "skill") {
          return mockSkills;
        }

        if (tableName === "skill_resource") {
          return mockResources;
        }

        return [];
      };

      return {
        where: (_condition: unknown) => {
          queryCount++;
          return makeResult(rowsForBaseTable());
        },
        innerJoin: (_joinTable: unknown, _condition: unknown) => ({
          where: (_where: unknown) => {
            queryCount++;
            const rows = mockResources.map((resource) => {
              const parent = mockSkills.find((skill) => skill.id === resource.skillId);
              return {
                id: resource.id,
                path: resource.path,
                skillId: resource.skillId,
                skillName: parent?.name ?? "",
              };
            });
            return makeResult(rows);
          },
        }),
      };
    },
  });

  return {
    db: {
      select: () => makeSelectChain(),
    },
  };
});

const { renderMentions } = await import("./render-mentions");

describe("renderMentions", () => {
  beforeEach(() => {
    queryCount = 0;
  });

  test("returns markdown unchanged when no mentions", async () => {
    const md = "# Hello\n\nJust plain text.";
    const result = await renderMentions(md);
    expect(result).toBe(md);
  });

  test("replaces skill mention with resolved name", async () => {
    const md = `Check out [[skill:${SKILL_A_ID}]] for more info.`;
    const result = await renderMentions(md);
    expect(result).toBe(`Check out \`TypeScript Basics\` for more info.`);
  });

  test("keeps escaped mention tokens literal and removes escapes", async () => {
    const md = `Check \\[[resource:${RESOURCE_ID}]] and \\[[skill:${SKILL_A_ID}]].`;
    const result = await renderMentions(md);
    expect(result).toBe(`Check [[resource:${RESOURCE_ID}]] and [[skill:${SKILL_A_ID}]].`);
  });

  test("removes bracket-level escapes from literal mention tokens", async () => {
    const md = String.raw`Check \[\[skill:${SKILL_A_ID}\]\]`;
    const result = await renderMentions(md);
    expect(result).toBe(`Check [[skill:${SKILL_A_ID}]]`);
  });

  test("replaces resource mention with resolved name and parent skill name", async () => {
    const md = `See [[resource:${RESOURCE_ID}]] for examples.`;
    const result = await renderMentions(md);
    expect(result).toBe(`See \`examples/hooks.ts for TypeScript Basics\` for examples.`);
  });

  test("renders unescaped mention and preserves escaped literal mention", async () => {
    const md = `Use [[skill:${SKILL_A_ID}]] and show \\[[skill:${SKILL_B_ID}]]`;
    const result = await renderMentions(md);

    expect(result).toContain("`TypeScript Basics`");
    expect(result).toContain(`[[skill:${SKILL_B_ID}]]`);
  });

  test("replaces multiple mentions in same markdown", async () => {
    const md = `Start with [[skill:${SKILL_A_ID}]] then try [[skill:${SKILL_B_ID}]].`;
    const result = await renderMentions(md);
    expect(result).toContain("`TypeScript Basics`");
    expect(result).toContain("`React Patterns`");
  });

  test("unknown skill mention resolves to fallback text", async () => {
    const md = `See [[skill:${UNKNOWN_SKILL_ID}]].`;
    const result = await renderMentions(md);
    expect(result).toBe("See `(unknown skill)`.");
  });

  test("unknown resource mention resolves to fallback text", async () => {
    const md = `See [[resource:${UNKNOWN_RESOURCE_ID}]].`;
    const result = await renderMentions(md);
    expect(result).toBe("See `(unknown resource)`.");
  });

  test("self-reference resource renders just the path", async () => {
    const md = `See [[resource:${RESOURCE_ID}]] for examples.`;
    const result = await renderMentions(md, { currentSkillId: SKILL_A_ID });
    expect(result).toBe(`See \`examples/hooks.ts\` for examples.`);
  });

  test("handles mixed known and unknown mentions", async () => {
    const md = `[[skill:${SKILL_A_ID}]] and [[skill:${UNKNOWN_SKILL_ID}]]`;
    const result = await renderMentions(md);
    expect(result).toContain("`TypeScript Basics`");
    expect(result).toContain("`(unknown skill)`");
  });

  test("case-insensitive mention type", async () => {
    const md = `See [[Skill:${SKILL_A_ID}]].`;
    const result = await renderMentions(md);
    expect(result).toContain("`TypeScript Basics`");
  });

  test("renders linked markdown when linkMentions is true", async () => {
    const md = `See [[skill:${SKILL_A_ID}]] and [[resource:${RESOURCE_ID}]].`;
    const result = await renderMentions(md, { linkMentions: true, currentSkillId: SKILL_A_ID });
    expect(result).toContain(`/dashboard/skills/${SKILL_A_ID}?mention=skill%3A${SKILL_A_ID}`);
    expect(result).toContain(
      `/dashboard/skills/${SKILL_A_ID}/resources/examples/hooks.ts?mention=resource%3A${RESOURCE_ID}`,
    );
  });

  test("does not query DB when no mentions present", async () => {
    await renderMentions("plain text");
    expect(queryCount).toBe(0);
  });

  test("does not query DB for escaped mention tokens", async () => {
    await renderMentions(`show \\[[skill:${SKILL_A_ID}]]`);
    expect(queryCount).toBe(0);
  });
});
