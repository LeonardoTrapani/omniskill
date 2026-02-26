import { describe, expect, test } from "bun:test";

import {
  collectNewResourceMentionPaths,
  normalizeResourcePath,
  resolveNewResourceMentionsToUuids,
  stripNewResourceMentionsForCreate,
} from "./new-resource-mentions";

describe("new resource mentions", () => {
  test("normalizes resource paths", () => {
    expect(normalizeResourcePath("./references/guide.md#intro")).toBe("references/guide.md");
    expect(normalizeResourcePath("\\references\\guide.md?raw=1")).toBe("references/guide.md");
  });

  test("collects deduplicated paths from new tokens", () => {
    const markdown = [
      "First [[resource:new:references/guide.md]]",
      "Again [[resource:new:./references/guide.md#top]]",
      "And [[resource:new:scripts/setup.ts]]",
    ].join("\n");

    expect(collectNewResourceMentionPaths(markdown)).toEqual([
      "references/guide.md",
      "scripts/setup.ts",
    ]);
  });

  test("strips new tokens into non-mention placeholders for create", () => {
    const markdown = "Use [[resource:new:references/guide.md]] first";

    expect(stripNewResourceMentionsForCreate(markdown)).toBe("Use `references/guide.md` first");
  });

  test("resolves new tokens into resource uuid mentions", () => {
    const markdown =
      "Use [[resource:new:references/guide.md]] and [[resource:new:scripts/setup.ts]]";
    const map = new Map([
      ["references/guide.md", "A1B2C3D4-E5F6-7890-ABCD-EF1234567890"],
      ["scripts/setup.ts", "b2c3d4e5-f6a7-8901-bcde-f12345678901"],
    ]);

    const result = resolveNewResourceMentionsToUuids(markdown, map);

    expect(result.missingPaths).toEqual([]);
    expect(result.markdown).toBe(
      "Use [[resource:a1b2c3d4-e5f6-7890-abcd-ef1234567890]] and [[resource:b2c3d4e5-f6a7-8901-bcde-f12345678901]]",
    );
  });

  test("reports missing paths when resolution map is incomplete", () => {
    const markdown = "Use [[resource:new:references/missing.md]]";
    const result = resolveNewResourceMentionsToUuids(markdown, new Map());

    expect(result.markdown).toBe(markdown);
    expect(result.missingPaths).toEqual(["references/missing.md"]);
  });

  test("collects new mentions inside inline code (backslash is the only escape)", () => {
    const markdown = [
      "Example: `[[resource:new:references/example.md]]`",
      "Actual: [[resource:new:references/real.md]]",
    ].join("\n");

    expect(collectNewResourceMentionPaths(markdown)).toEqual([
      "references/example.md",
      "references/real.md",
    ]);
  });

  test("collects new mentions inside fenced code blocks (backslash is the only escape)", () => {
    const markdown = [
      "```md",
      "[[resource:new:references/example.md]]",
      "```",
      "Actual: [[resource:new:references/real.md]]",
    ].join("\n");

    expect(collectNewResourceMentionPaths(markdown)).toEqual([
      "references/example.md",
      "references/real.md",
    ]);
  });

  test("ignores escaped new mention tokens", () => {
    const markdown = String.raw`Literal \[[resource:new:references/example.md]] and active [[resource:new:references/real.md]]`;

    expect(collectNewResourceMentionPaths(markdown)).toEqual(["references/real.md"]);
  });

  test("ignores unknown token prefixes", () => {
    const markdown =
      "Unknown [[thing:new:references/guide.md]] and active [[resource:new:scripts/setup.ts]]";

    expect(collectNewResourceMentionPaths(markdown)).toEqual(["scripts/setup.ts"]);

    const stripped = stripNewResourceMentionsForCreate(markdown);
    expect(stripped).toBe(
      "Unknown [[thing:new:references/guide.md]] and active `scripts/setup.ts`",
    );

    const resolved = resolveNewResourceMentionsToUuids(
      markdown,
      new Map([["scripts/setup.ts", "c3d4e5f6-a7b8-9012-cdef-123456789012"]]),
    );

    expect(resolved.markdown).toBe(
      "Unknown [[thing:new:references/guide.md]] and active [[resource:c3d4e5f6-a7b8-9012-cdef-123456789012]]",
    );
    expect(resolved.missingPaths).toEqual([]);
  });
});
