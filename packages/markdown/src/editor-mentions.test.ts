import { describe, expect, test } from "bun:test";

import {
  editorMarkdownToStorageMarkdown,
  getHrefPath,
  getInternalSkillsHref,
  parseMentionHref,
  storageMarkdownToEditorMarkdown,
} from "./editor-mentions";

const SKILL_ID = "8275ee16-4275-4901-9d4a-5d80480abe46";
const RESOURCE_ID = "fdb97adb-5ea8-4d89-bd24-560af11ec22f";

describe("editor mention utilities", () => {
  test("parses mention hrefs for default skill routes", () => {
    expect(parseMentionHref(`/vault/skills/${SKILL_ID}?mention=skill:${SKILL_ID}`)).toEqual({
      type: "skill",
      targetId: SKILL_ID,
    });
  });

  test("supports custom dashboard route prefixes", () => {
    expect(
      parseMentionHref(`/dashboard/skills/${SKILL_ID}?mention=resource:${RESOURCE_ID}`, {
        skillsPrefixes: ["/dashboard/skills"],
      }),
    ).toEqual({ type: "resource", targetId: RESOURCE_ID });

    expect(
      getInternalSkillsHref(`/dashboard/skills/${SKILL_ID}?mention=skill:${SKILL_ID}#graph`, {
        skillsPrefixes: ["/dashboard/skills"],
      }),
    ).toBe(`/dashboard/skills/${SKILL_ID}?mention=skill:${SKILL_ID}#graph`);
  });

  test("extracts decoded relative href paths only", () => {
    expect(
      getHrefPath(
        `/vault/skills/${SKILL_ID}/resources/docs/%5Bintro%5D.md?mention=resource:${RESOURCE_ID}`,
      ),
    ).toBe(`/vault/skills/${SKILL_ID}/resources/docs/[intro].md`);
    expect(getHrefPath(`https://example.com/vault/skills/${SKILL_ID}`)).toBeNull();
  });

  test("restores mention links when rendered labels contain brackets", () => {
    const originalMarkdown = `See [[skill:${SKILL_ID}]]`;
    const renderedMarkdown =
      `See [\`Design System [v2]\`]` + `(/vault/skills/${SKILL_ID}?mention=skill%3A${SKILL_ID})`;

    const result = storageMarkdownToEditorMarkdown({
      originalMarkdown,
      renderedMarkdown,
    });

    expect(result).toBe(
      `See [Design System \\[v2\\]]` + `(/vault/skills/${SKILL_ID}?mention=skill:${SKILL_ID})`,
    );
  });

  test("converts mention links back to persisted mention tokens", () => {
    const editorMarkdown =
      `See [Design System \\[v2\\]]` +
      `(/vault/skills/${SKILL_ID}?mention=skill:${SKILL_ID})` +
      ` and [docs/\\[intro\\].md for Design System \\[v2\\]]` +
      `(/vault/skills/${SKILL_ID}/resources/docs/%5Bintro%5D.md?mention=resource:${RESOURCE_ID})`;

    const result = editorMarkdownToStorageMarkdown(editorMarkdown);

    expect(result).toBe(`See [[skill:${SKILL_ID}]] and [[resource:${RESOURCE_ID}]]`);
  });
});
