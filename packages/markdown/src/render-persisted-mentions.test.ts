import { describe, expect, test } from "bun:test";

import {
  renderPersistedMentionsWithLinks,
  renderPersistedMentionsWithoutLinks,
} from "./render-persisted-mentions";

const SKILL_A_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const SKILL_B_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
const RESOURCE_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012";
const UNKNOWN_SKILL_ID = "d4e5f6a7-b8c9-0123-defa-234567890123";
const UNKNOWN_RESOURCE_ID = "e5f6a7b8-c9d0-1234-efab-345678901234";

const skillNameById = new Map<string, string>([
  [SKILL_A_ID, "TypeScript Basics"],
  [SKILL_B_ID, "React Patterns"],
]);

const resourceInfoById = new Map([
  [
    RESOURCE_ID,
    {
      resourcePath: "examples/hooks.ts",
      skillName: "TypeScript Basics",
      skillId: SKILL_A_ID,
    },
  ],
]);

describe("render persisted mentions", () => {
  test("returns markdown unchanged when no mentions", () => {
    const md = "# Hello\n\nJust plain text.";
    const result = renderPersistedMentionsWithoutLinks(md, {
      skillNameById,
      resourceInfoById,
    });

    expect(result).toBe(md);
  });

  test("replaces skill mention with resolved name", () => {
    const md = `Check out [[skill:${SKILL_A_ID}]] for more info.`;
    const result = renderPersistedMentionsWithoutLinks(md, {
      skillNameById,
      resourceInfoById,
    });

    expect(result).toBe("Check out `TypeScript Basics` for more info.");
  });

  test("replaces resource mention with path + parent skill", () => {
    const md = `See [[resource:${RESOURCE_ID}]] for examples.`;
    const result = renderPersistedMentionsWithoutLinks(md, {
      skillNameById,
      resourceInfoById,
    });

    expect(result).toBe("See `examples/hooks.ts for TypeScript Basics` for examples.");
  });

  test("renders self-skill resource labels without parent skill name", () => {
    const md = `See [[resource:${RESOURCE_ID}]] for examples.`;
    const result = renderPersistedMentionsWithoutLinks(md, {
      skillNameById,
      resourceInfoById,
      currentSkillId: SKILL_A_ID,
    });

    expect(result).toBe("See `examples/hooks.ts` for examples.");
  });

  test("renders unknown mentions with fallback labels", () => {
    const md = `[[skill:${UNKNOWN_SKILL_ID}]] and [[resource:${UNKNOWN_RESOURCE_ID}]]`;
    const result = renderPersistedMentionsWithoutLinks(md, {
      skillNameById,
      resourceInfoById,
    });

    expect(result).toContain("`(unknown skill)`");
    expect(result).toContain("`(unknown resource)`");
  });

  test("renders linked markdown for frontend rendering", () => {
    const md = `See [[skill:${SKILL_A_ID}]] and [[resource:${RESOURCE_ID}]].`;
    const result = renderPersistedMentionsWithLinks(md, {
      skillNameById,
      resourceInfoById,
      currentSkillId: SKILL_A_ID,
    });

    expect(result).toContain(`/vault/skills/${SKILL_A_ID}?mention=skill%3A${SKILL_A_ID}`);
    expect(result).toContain(
      `/vault/skills/${SKILL_A_ID}/resources/examples/hooks.ts?mention=resource%3A${RESOURCE_ID}`,
    );
  });

  test("keeps escaped tokens literal and removes escape markers", () => {
    const md = `Use \\[[skill:${SKILL_B_ID}]] and \\[[resource:${RESOURCE_ID}]]`;
    const result = renderPersistedMentionsWithoutLinks(md, {
      skillNameById,
      resourceInfoById,
    });

    expect(result).toBe(`Use [[skill:${SKILL_B_ID}]] and [[resource:${RESOURCE_ID}]]`);
  });

  test("removes bracket-level escapes from literal mention tokens", () => {
    const md = String.raw`Check \[\[skill:${SKILL_A_ID}\]\]`;
    const result = renderPersistedMentionsWithoutLinks(md, {
      skillNameById,
      resourceInfoById,
    });

    expect(result).toBe(`Check [[skill:${SKILL_A_ID}]]`);
  });
});
