import { describe, expect, test } from "bun:test";

import {
  findInvalidMentionTokens,
  formatPersistedMentionQuery,
  parseMentions,
  parsePersistedMentionQuery,
  remapMentionTargetIds,
} from "./persisted-mentions";

describe("persisted mentions", () => {
  const SKILL_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const RESOURCE_ID = "f0e1d2c3-b4a5-6789-0abc-def123456789";
  const NEW_SKILL_ID = "11111111-2222-3333-4444-555555555555";
  const NEW_RESOURCE_ID = "66666666-7777-8888-9999-aaaaaaaaaaaa";

  test("extracts skill mention", () => {
    const md = `Some text [[skill:${SKILL_ID}]] more text`;
    expect(parseMentions(md)).toEqual([{ type: "skill", targetId: SKILL_ID }]);
  });

  test("extracts resource mention", () => {
    const md = `Check [[resource:${RESOURCE_ID}]] here`;
    expect(parseMentions(md)).toEqual([{ type: "resource", targetId: RESOURCE_ID }]);
  });

  test("ignores escaped mention tokens", () => {
    const md = `Check \\[[resource:${RESOURCE_ID}]] and \\[[skill:${SKILL_ID}]]`;
    expect(parseMentions(md)).toEqual([]);
  });

  test("extracts multiple mentions from mixed text", () => {
    const md = [
      "# My Skill",
      "",
      `Related to [[skill:${SKILL_ID}]] and also`,
      `see [[resource:${RESOURCE_ID}]] for details.`,
      "",
      "Some plain text without mentions.",
    ].join("\n");

    expect(parseMentions(md)).toEqual([
      { type: "skill", targetId: SKILL_ID },
      { type: "resource", targetId: RESOURCE_ID },
    ]);
  });

  test("deduplicates identical mentions", () => {
    const md = [
      `First [[skill:${SKILL_ID}]]`,
      `Again [[skill:${SKILL_ID}]]`,
      `And again [[skill:${SKILL_ID}]]`,
    ].join("\n");

    expect(parseMentions(md)).toEqual([{ type: "skill", targetId: SKILL_ID }]);
  });

  test("finds malformed mention targets", () => {
    const md = "See [[skill:my-slug]] and [[resource:references/guide.md]]";

    expect(findInvalidMentionTokens(md)).toEqual([
      { type: "skill", target: "my-slug" },
      { type: "resource", target: "references/guide.md" },
    ]);
  });

  test("ignores escaped malformed mention targets", () => {
    const md = "See \\[[skill:my-slug]] and \\[[resource:references/guide.md]]";

    expect(findInvalidMentionTokens(md)).toEqual([]);
  });

  test("parses mention tokens inside inline code (backslash is the only escape)", () => {
    const md = [
      `Inline code: \`[[skill:${SKILL_ID}]]\``,
      `Outside code: [[resource:${RESOURCE_ID}]]`,
    ].join("\n");

    expect(parseMentions(md)).toEqual([
      { type: "skill", targetId: SKILL_ID },
      { type: "resource", targetId: RESOURCE_ID },
    ]);
  });

  test("parses mention tokens inside fenced code blocks (backslash is the only escape)", () => {
    const md = [
      "```md",
      `[[skill:${SKILL_ID}]]`,
      "```",
      `Outside code [[resource:${RESOURCE_ID}]]`,
    ].join("\n");

    expect(parseMentions(md)).toEqual([
      { type: "skill", targetId: SKILL_ID },
      { type: "resource", targetId: RESOURCE_ID },
    ]);
  });

  test("remaps skill and resource mention target ids", () => {
    const md = `See [[skill:${SKILL_ID}]] and [[resource:${RESOURCE_ID}]]`;
    const remapped = remapMentionTargetIds(
      md,
      new Map([
        [SKILL_ID, NEW_SKILL_ID],
        [RESOURCE_ID, NEW_RESOURCE_ID],
      ]),
    );

    expect(remapped).toBe(`See [[skill:${NEW_SKILL_ID}]] and [[resource:${NEW_RESOURCE_ID}]]`);
  });

  test("does not remap escaped mention tokens", () => {
    const md = `Check \\[[Skill:${SKILL_ID}]] and \\[[resource:${RESOURCE_ID}]]`;
    const remapped = remapMentionTargetIds(
      md,
      new Map([
        [SKILL_ID, NEW_SKILL_ID],
        [RESOURCE_ID, NEW_RESOURCE_ID],
      ]),
    );

    expect(remapped).toBe(md);
  });

  test("parses persisted mention query value", () => {
    expect(parsePersistedMentionQuery(`skill:${SKILL_ID}`)).toEqual({
      type: "skill",
      targetId: SKILL_ID,
    });
    expect(parsePersistedMentionQuery(`RESOURCE:${RESOURCE_ID}`)).toEqual({
      type: "resource",
      targetId: RESOURCE_ID,
    });
  });

  test("rejects invalid persisted mention query values", () => {
    expect(parsePersistedMentionQuery("skill:not-a-uuid")).toBeNull();
    expect(parsePersistedMentionQuery("bad")).toBeNull();
  });

  test("formats persisted mention query value with lowercase id", () => {
    const mixed = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890";
    expect(formatPersistedMentionQuery("skill", mixed)).toBe(`skill:${mixed.toLowerCase()}`);
  });
});
