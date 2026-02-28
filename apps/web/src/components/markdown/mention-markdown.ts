import {
  editorMarkdownToStorageMarkdown as sharedEditorMarkdownToStorageMarkdown,
  getHrefPath as sharedGetHrefPath,
  getInternalSkillsHref,
  parseMentionHref as sharedParseMentionHref,
  storageMarkdownToEditorMarkdown as sharedStorageMarkdownToEditorMarkdown,
} from "@better-skills/markdown/editor-mentions";
import {
  buildResourceMentionHref as buildSharedResourceMentionHref,
  buildSkillMentionHref as buildSharedSkillMentionHref,
} from "@better-skills/markdown/mention-hrefs";

const WEB_SKILLS_PREFIXES = ["/vault/skills", "/dashboard/skills"] as const;

export function getHrefPath(rawHref: string): string | null {
  return sharedGetHrefPath(rawHref);
}

export function getInternalDashboardHref(rawHref: string): string | null {
  return getInternalSkillsHref(rawHref, { skillsPrefixes: WEB_SKILLS_PREFIXES });
}

export function parseMentionHref(rawHref: string) {
  return sharedParseMentionHref(rawHref, { skillsPrefixes: WEB_SKILLS_PREFIXES });
}

export function buildSkillMentionHref(skillId: string) {
  return buildSharedSkillMentionHref(skillId);
}

export function buildResourceMentionHref(
  skillId: string,
  resourcePath: string,
  resourceId: string,
) {
  return buildSharedResourceMentionHref(skillId, resourcePath, resourceId);
}

export function storageMarkdownToEditorMarkdown(options: {
  originalMarkdown: string;
  renderedMarkdown?: string | null;
}) {
  return sharedStorageMarkdownToEditorMarkdown({
    ...options,
    skillsPrefixes: WEB_SKILLS_PREFIXES,
  });
}

export function editorMarkdownToStorageMarkdown(editorMarkdown: string) {
  return sharedEditorMarkdownToStorageMarkdown(editorMarkdown, {
    skillsPrefixes: WEB_SKILLS_PREFIXES,
  });
}
