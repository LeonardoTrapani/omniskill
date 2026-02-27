import { describe, expect, test } from "bun:test";

import {
  buildMentionQuery,
  buildResourceMentionHref,
  buildSkillMentionHref,
  parseMentionQuery,
} from "./mention-hrefs";

describe("mention hrefs", () => {
  const SKILL_ID = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890";
  const RESOURCE_ID = "B2C3D4E5-F6A7-8901-BCDE-F12345678901";

  test("builds skill mention href", () => {
    expect(buildSkillMentionHref(SKILL_ID)).toBe(
      `/vault/skills/${SKILL_ID.toLowerCase()}?mention=skill%3A${SKILL_ID.toLowerCase()}`,
    );
  });

  test("builds resource mention href", () => {
    expect(buildResourceMentionHref(SKILL_ID, "references/guide.md", RESOURCE_ID)).toBe(
      `/vault/skills/${SKILL_ID.toLowerCase()}/resources/references/guide.md?mention=resource%3A${RESOURCE_ID.toLowerCase()}`,
    );
  });

  test("supports custom skills prefix", () => {
    expect(buildSkillMentionHref(SKILL_ID, { skillsPrefix: "/dashboard/skills" })).toBe(
      `/dashboard/skills/${SKILL_ID.toLowerCase()}?mention=skill%3A${SKILL_ID.toLowerCase()}`,
    );
  });

  test("builds mention query", () => {
    expect(buildMentionQuery("resource", RESOURCE_ID)).toBe(
      `?mention=resource%3A${RESOURCE_ID.toLowerCase()}`,
    );
  });

  test("parses mention query values", () => {
    expect(parseMentionQuery(`skill:${SKILL_ID}`)).toEqual({
      type: "skill",
      targetId: SKILL_ID.toLowerCase(),
    });
    expect(parseMentionQuery(`resource:${RESOURCE_ID}`)).toEqual({
      type: "resource",
      targetId: RESOURCE_ID.toLowerCase(),
    });
  });

  test("rejects invalid mention query values", () => {
    expect(parseMentionQuery("skill:not-a-uuid")).toBeNull();
  });
});
