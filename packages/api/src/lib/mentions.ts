import { transformOutsideMarkdownCode } from "@better-skills/markdown/transform-outside-markdown-code";

// UUID v4 pattern (lowercase hex, 8-4-4-4-12)
const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_VALUE_RE = new RegExp(`^${UUID_RE}$`, "i");

// matches unescaped [[skill:<uuid>]] / [[resource:<uuid>]]
const MENTION_RE = new RegExp(String.raw`(?<!\\)\[\[(skill|resource):(${UUID_RE})\]\]`, "gi");

const MENTION_TOKEN_RE = new RegExp(String.raw`(?<!\\)\[\[(skill|resource):([^\]\n]+)\]\]`, "gi");

export type MentionType = "skill" | "resource";

export interface Mention {
  type: MentionType;
  targetId: string;
}

export interface InvalidMentionToken {
  type: MentionType;
  target: string;
}

/**
 * Extract deduplicated [[skill:<uuid>]] and [[resource:<uuid>]] mentions
 * from markdown text. Only considers tokens where both [[ and ]] appear
 * on the same line.
 */
export function parseMentions(markdown: string): Mention[] {
  const seen = new Set<string>();
  const result: Mention[] = [];

  transformOutsideMarkdownCode(markdown, (segment) => {
    let match: RegExpExecArray | null;
    // reset lastIndex for each segment since we reuse the regex
    MENTION_RE.lastIndex = 0;

    while ((match = MENTION_RE.exec(segment)) !== null) {
      const type = match[1]!.toLowerCase() as MentionType;
      const targetId = match[2]!.toLowerCase();
      const key = `${type}:${targetId}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push({ type, targetId });
      }
    }

    return segment;
  });

  return result;
}

/**
 * Extract mention-like tokens whose target is not a UUID.
 */
export function findInvalidMentionTokens(markdown: string): InvalidMentionToken[] {
  const seen = new Set<string>();
  const result: InvalidMentionToken[] = [];

  transformOutsideMarkdownCode(markdown, (segment) => {
    let match: RegExpExecArray | null;
    MENTION_TOKEN_RE.lastIndex = 0;

    while ((match = MENTION_TOKEN_RE.exec(segment)) !== null) {
      const type = match[1]!.toLowerCase() as MentionType;
      const target = match[2]!.trim();

      if (UUID_VALUE_RE.test(target)) {
        continue;
      }

      const key = `${type}:${target.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push({ type, target });
    }

    return segment;
  });

  return result;
}
