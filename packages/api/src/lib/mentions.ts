// UUID v4 pattern (lowercase hex, 8-4-4-4-12)
const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_VALUE_RE = new RegExp(`^${UUID_RE}$`, "i");

// matches unescaped [[skill:<uuid>]] / [[resource:<uuid>]]
const MENTION_RE = new RegExp(String.raw`(?<!\\)\[\[(skill|resource):(${UUID_RE})\]\]`, "gi");

const MENTION_TOKEN_RE = new RegExp(String.raw`(?<!\\)\[\[(skill|resource):([^\]\n]+)\]\]`, "gi");

function transformOutsideMarkdownCode(
  markdown: string,
  transform: (segment: string) => string,
): string {
  const lines = markdown.split("\n");
  let inFence = false;
  let fenceMarker: "`" | "~" | null = null;

  const transformedLines = lines.map((line) => {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);

    if (fenceMatch) {
      const marker = fenceMatch[1]![0] as "`" | "~";

      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
        return line;
      }

      if (fenceMarker === marker) {
        inFence = false;
        fenceMarker = null;
      }

      return line;
    }

    if (inFence) {
      return line;
    }

    const parts = line.split(/(`[^`]*`)/g);
    return parts
      .map((part) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return part;
        }

        return transform(part);
      })
      .join("");
  });

  return transformedLines.join("\n");
}

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
 * Rewrite mention target UUIDs using the provided map while preserving the
 * original token format (escaped brackets, type casing, etc).
 */
export function remapMentionTargetIds(
  markdown: string,
  idMap: ReadonlyMap<string, string>,
): string {
  if (idMap.size === 0) return markdown;

  return transformOutsideMarkdownCode(markdown, (segment) =>
    segment.replace(MENTION_RE, (match, _type: string, targetId: string) => {
      const remappedId = idMap.get(targetId.toLowerCase());
      if (!remappedId) return match;
      return match.replace(targetId, remappedId.toLowerCase());
    }),
  );
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
