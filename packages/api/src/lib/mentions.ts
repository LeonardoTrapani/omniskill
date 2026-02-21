// UUID v4 pattern (lowercase hex, 8-4-4-4-12)
const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// matches [[skill:<uuid>]] or [[resource:<uuid>]] within a single line
const MENTION_RE = new RegExp(`\\[\\[(skill|resource):(${UUID_RE})\\]\\]`, "gi");

export type MentionType = "skill" | "resource";

export interface Mention {
  type: MentionType;
  targetId: string;
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
