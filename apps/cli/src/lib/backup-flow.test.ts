import { describe, expect, test } from "bun:test";

import { rewriteInlineLinksToDraftMentions } from "./backup-flow";

describe("rewriteInlineLinksToDraftMentions", () => {
  test("rewrites local references links", () => {
    const input = "Read [create](references/flows/create-skill.md) first.";

    const result = rewriteInlineLinksToDraftMentions(input);

    expect(result.replacementCount).toBe(1);
    expect(result.markdown).toContain("[[resource:new:references/flows/create-skill.md]]");
  });

  test("normalizes draft mention path while rewriting", () => {
    const input = "Read [guide](<./references/guide.md#top>) first.";

    const result = rewriteInlineLinksToDraftMentions(input);

    expect(result.replacementCount).toBe(1);
    expect(result.markdown).toContain("[[resource:new:references/guide.md]]");
  });

  test("ignores web links, anchors, and images", () => {
    const input = [
      "[web](https://example.com)",
      "[anchor](#overview)",
      "![image](references/diagram.png)",
    ].join("\n");

    const result = rewriteInlineLinksToDraftMentions(input);

    expect(result.replacementCount).toBe(0);
    expect(result.markdown).toBe(input);
  });

  test("ignores links inside inline and fenced code", () => {
    const input = [
      "Inline code: `[doc](references/guide.md)`",
      "",
      "```md",
      "[doc](references/guide.md)",
      "```",
      "",
      "Outside: [doc](references/guide.md)",
    ].join("\n");

    const result = rewriteInlineLinksToDraftMentions(input);

    expect(result.replacementCount).toBe(1);
    expect(result.markdown).toContain("Outside: [[resource:new:references/guide.md]]");
    expect(result.markdown).toContain("Inline code: `[doc](references/guide.md)`");
    expect(result.markdown).toContain("```md\n[doc](references/guide.md)\n```");
  });
});
