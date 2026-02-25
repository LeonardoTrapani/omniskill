import { describe, expect, test } from "bun:test";

import { parseMentions } from "./mentions";

describe("parseMentions", () => {
  const SKILL_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const RESOURCE_ID = "f0e1d2c3-b4a5-6789-0abc-def123456789";

  test("extracts skill mention", () => {
    const md = `Some text [[skill:${SKILL_ID}]] more text`;
    expect(parseMentions(md)).toEqual([{ type: "skill", targetId: SKILL_ID }]);
  });

  test("extracts resource mention", () => {
    const md = `Check [[resource:${RESOURCE_ID}]] here`;
    expect(parseMentions(md)).toEqual([{ type: "resource", targetId: RESOURCE_ID }]);
  });

  test("extracts escaped mention tokens", () => {
    const md = String.raw`Check \[\[resource:${RESOURCE_ID}\]\] and \[\[skill:${SKILL_ID}\]\]`;
    expect(parseMentions(md)).toEqual([
      { type: "resource", targetId: RESOURCE_ID },
      { type: "skill", targetId: SKILL_ID },
    ]);
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

  test("multiple mentions on the same line", () => {
    const md = `See [[skill:${SKILL_ID}]] and [[resource:${RESOURCE_ID}]] here`;
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

  test("ignores malformed tokens - missing prefix", () => {
    expect(parseMentions(`[[${SKILL_ID}]]`)).toEqual([]);
  });

  test("ignores malformed tokens - wrong prefix", () => {
    expect(parseMentions(`[[link:${SKILL_ID}]]`)).toEqual([]);
    expect(parseMentions(`[[tag:${SKILL_ID}]]`)).toEqual([]);
  });

  test("ignores malformed tokens - invalid uuid", () => {
    expect(parseMentions("[[skill:not-a-uuid]]")).toEqual([]);
    expect(parseMentions("[[skill:12345]]")).toEqual([]);
    expect(parseMentions("[[resource:abc]]")).toEqual([]);
  });

  test("ignores unclosed brackets", () => {
    expect(parseMentions(`[[skill:${SKILL_ID}`)).toEqual([]);
  });

  test("ignores brackets split across lines", () => {
    const md = `[[skill:\n${SKILL_ID}]]`;
    expect(parseMentions(md)).toEqual([]);
  });

  test("handles empty string", () => {
    expect(parseMentions("")).toEqual([]);
  });

  test("handles text with no mentions", () => {
    expect(parseMentions("Just regular markdown\nwith no mentions")).toEqual([]);
  });

  test("case-insensitive type matching", () => {
    const md = `[[Skill:${SKILL_ID}]] and [[RESOURCE:${RESOURCE_ID}]]`;
    expect(parseMentions(md)).toEqual([
      { type: "skill", targetId: SKILL_ID },
      { type: "resource", targetId: RESOURCE_ID },
    ]);
  });

  test("ignores nested brackets", () => {
    // [[skill:[[resource:uuid]]]] should not match
    expect(parseMentions(`[[skill:[[resource:${RESOURCE_ID}]]]]`)).toEqual([
      { type: "resource", targetId: RESOURCE_ID },
    ]);
  });

  test("ignores single brackets", () => {
    expect(parseMentions(`[skill:${SKILL_ID}]`)).toEqual([]);
  });
});
