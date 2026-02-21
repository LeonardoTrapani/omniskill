import { beforeEach, describe, expect, mock, test } from "bun:test";

const SKILL_A_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const SKILL_B_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
const RESOURCE_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012";
const UNKNOWN_SKILL_ID = "d4e5f6a7-b8c9-0123-defa-234567890123";
const UNKNOWN_RESOURCE_ID = "e5f6a7b8-c9d0-1234-efab-345678901234";

const mockSkills = [
  { id: SKILL_A_ID, name: "TypeScript Basics" },
  { id: SKILL_B_ID, name: "React Patterns" },
];

const mockResources = [{ id: RESOURCE_ID, path: "examples/hooks.ts", skillId: SKILL_A_ID }];

let queryCount = 0;

const drizzleNameSym = Symbol.for("drizzle:Name");

mock.module("@omniscient/db", () => {
  const makeSelectChain = () => ({
    from: (table: unknown) => ({
      where: (_condition: unknown) => {
        queryCount++;
        const tableName =
          table && typeof table === "object" && drizzleNameSym in table
            ? (table as Record<symbol, string>)[drizzleNameSym]
            : "unknown";

        if (tableName === "skill") return Promise.resolve(mockSkills);
        if (tableName === "skill_resource") return Promise.resolve(mockResources);
        return Promise.resolve([]);
      },
    }),
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
    expect(result).toBe(
      `Check out Fetch the skill "TypeScript Basics" to get details. for more info.`,
    );
  });

  test("replaces resource mention with resolved name and parent skill", async () => {
    const md = `See [[resource:${RESOURCE_ID}]] for examples.`;
    const result = await renderMentions(md);
    expect(result).toBe(
      `See Fetch the skill "TypeScript Basics" and get reference "examples/hooks.ts". for examples.`,
    );
  });

  test("replaces multiple mentions in same markdown", async () => {
    const md = `Start with [[skill:${SKILL_A_ID}]] then try [[skill:${SKILL_B_ID}]].`;
    const result = await renderMentions(md);
    expect(result).toContain(`Fetch the skill "TypeScript Basics" to get details.`);
    expect(result).toContain(`Fetch the skill "React Patterns" to get details.`);
  });

  test("unknown skill mention resolves to fallback text", async () => {
    const md = `See [[skill:${UNKNOWN_SKILL_ID}]].`;
    const result = await renderMentions(md);
    expect(result).toBe(`See Fetch the skill "(unknown skill)" to get details..`);
  });

  test("unknown resource mention resolves to fallback text", async () => {
    const md = `See [[resource:${UNKNOWN_RESOURCE_ID}]].`;
    const result = await renderMentions(md);
    expect(result).toBe(
      `See Fetch the skill "(unknown skill)" and get reference "(unknown resource)"..`,
    );
  });

  test("self-reference resource renders just the path", async () => {
    const md = `See [[resource:${RESOURCE_ID}]] for examples.`;
    const result = await renderMentions(md, SKILL_A_ID);
    expect(result).toBe(`See See reference "examples/hooks.ts". for examples.`);
  });

  test("handles mixed known and unknown mentions", async () => {
    const md = `[[skill:${SKILL_A_ID}]] and [[skill:${UNKNOWN_SKILL_ID}]]`;
    const result = await renderMentions(md);
    expect(result).toContain(`Fetch the skill "TypeScript Basics" to get details.`);
    expect(result).toContain(`Fetch the skill "(unknown skill)" to get details.`);
  });

  test("case-insensitive mention type", async () => {
    const md = `See [[Skill:${SKILL_A_ID}]].`;
    const result = await renderMentions(md);
    expect(result).toContain(`Fetch the skill "TypeScript Basics" to get details.`);
  });

  test("does not query DB when no mentions present", async () => {
    await renderMentions("plain text");
    expect(queryCount).toBe(0);
  });
});
