// UUID v4 pattern (lowercase hex, 8-4-4-4-12)
const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// matches [[skill:<uuid>]] / [[resource:<uuid>]] and escaped variants
// (e.g. \[\[resource:<uuid>\]\]) produced by some markdown editors.
const MENTION_RE = new RegExp(
  `\\\\?\\[\\\\?\\[(skill|resource):(${UUID_RE})\\\\?\\]\\\\?\\]`,
  "gi",
);

export type MentionType = "skill" | "resource";

export interface Mention {
  type: MentionType;
  targetId: string;
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

  return markdown.replace(MENTION_RE, (match, _type: string, targetId: string) => {
    const remappedId = idMap.get(targetId.toLowerCase());
    if (!remappedId) return match;
    return match.replace(targetId, remappedId.toLowerCase());
  });
}

/**
 * Extract deduplicated [[skill:<uuid>]] and [[resource:<uuid>]] mentions
 * from markdown text. Only considers tokens where both [[ and ]] appear
 * on the same line.
 */
export function parseMentions(markdown: string): Mention[] {
  const seen = new Set<string>();
  const result: Mention[] = [];

  for (const line of markdown.split("\n")) {
    let match: RegExpExecArray | null;
    // reset lastIndex for each line since we reuse the regex
    MENTION_RE.lastIndex = 0;

    while ((match = MENTION_RE.exec(line)) !== null) {
      const type = match[1]!.toLowerCase() as MentionType;
      const targetId = match[2]!.toLowerCase();
      const key = `${type}:${targetId}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push({ type, targetId });
      }
    }
  }

  return result;
}
