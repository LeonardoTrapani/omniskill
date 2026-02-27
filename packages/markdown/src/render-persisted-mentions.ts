import { buildResourceMentionHref, buildSkillMentionHref } from "./mention-hrefs";
import { createPersistedMentionRegex, parseMentions } from "./persisted-mentions";

const SKILL_FALLBACK = "`(unknown skill)`";
const RESOURCE_FALLBACK = "`(unknown resource)`";
const ESCAPED_MENTION_RE = new RegExp(String.raw`\\(\[\[(skill|resource):[^\]\n]+\]\])`, "gi");
const BRACKET_ESCAPED_MENTION_RE = new RegExp(
  String.raw`\\\[\\\[(skill|resource):([^\n]+?)\\\]\\\]`,
  "gi",
);

export interface MentionResourceRenderInfo {
  resourcePath: string;
  skillName: string;
  skillId: string;
}

export interface MentionRenderContext {
  skillNameById: ReadonlyMap<string, string>;
  resourceInfoById: ReadonlyMap<string, MentionResourceRenderInfo>;
  currentSkillId?: string;
}

interface RenderPersistedMentionsOptions extends MentionRenderContext {
  linkMentions: boolean;
}

function unescapeEscapedMentions(markdown: string): string {
  const withBracketEscapesRemoved = markdown.replace(
    BRACKET_ESCAPED_MENTION_RE,
    (_match, type: string, target: string) => `[[${type}:${target}]]`,
  );

  return withBracketEscapesRemoved.replace(ESCAPED_MENTION_RE, (_match, token: string) => token);
}

export function renderPersistedMentions(
  markdown: string,
  options: RenderPersistedMentionsOptions,
): string {
  const { skillNameById, resourceInfoById, currentSkillId, linkMentions } = options;
  const mentions = parseMentions(markdown);

  if (mentions.length === 0) {
    return unescapeEscapedMentions(markdown);
  }

  const mentionRegex = createPersistedMentionRegex();

  const rendered = markdown.replace(mentionRegex, (_match, type: string, targetId: string) => {
    const normalizedType = type.toLowerCase();
    const normalizedId = targetId.toLowerCase();

    if (normalizedType === "skill") {
      const skillName = skillNameById.get(normalizedId);
      if (!skillName) {
        return SKILL_FALLBACK;
      }

      const label = `\`${skillName}\``;
      if (!linkMentions) {
        return label;
      }

      return `[${label}](${buildSkillMentionHref(normalizedId)})`;
    }

    if (normalizedType === "resource") {
      const info = resourceInfoById.get(normalizedId);
      if (!info) {
        return RESOURCE_FALLBACK;
      }

      const sameSkill =
        currentSkillId && info.skillId.toLowerCase() === currentSkillId.toLowerCase();

      const label = sameSkill
        ? `\`${info.resourcePath}\``
        : `\`${info.resourcePath} for ${info.skillName}\``;

      if (!linkMentions) {
        return label;
      }

      return `[${label}](${buildResourceMentionHref(info.skillId, info.resourcePath, normalizedId)})`;
    }

    return _match;
  });

  return unescapeEscapedMentions(rendered);
}

export function renderPersistedMentionsWithoutLinks(
  markdown: string,
  options: MentionRenderContext,
): string {
  return renderPersistedMentions(markdown, {
    ...options,
    linkMentions: false,
  });
}

export function renderPersistedMentionsWithLinks(
  markdown: string,
  options: MentionRenderContext,
): string {
  return renderPersistedMentions(markdown, {
    ...options,
    linkMentions: true,
  });
}
