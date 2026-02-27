// UUID v4 pattern (lowercase hex, 8-4-4-4-12)
export const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_VALUE_RE = new RegExp(`^${UUID_RE}$`, "i");

const PERSISTED_MENTION_QUERY_RE = new RegExp(`^(skill|resource):(${UUID_RE})$`, "i");

export type MentionType = "skill" | "resource";

export interface Mention {
  type: MentionType;
  targetId: string;
}

export interface InvalidMentionToken {
  type: MentionType;
  target: string;
}

export function createPersistedMentionRegex() {
  return new RegExp(String.raw`(?<!\\)\[\[(skill|resource):(${UUID_RE})\]\]`, "gi");
}

export function createMentionTokenRegex() {
  return new RegExp(String.raw`(?<!\\)\[\[(skill|resource):([^\]\n]+)\]\]`, "gi");
}

export function parsePersistedMentionQuery(value: string): Mention | null {
  const match = PERSISTED_MENTION_QUERY_RE.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    type: match[1]!.toLowerCase() as MentionType,
    targetId: match[2]!.toLowerCase(),
  };
}

export function formatPersistedMentionQuery(type: MentionType, targetId: string): string {
  return `${type}:${targetId.toLowerCase()}`;
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

  const pattern = createPersistedMentionRegex();

  return markdown.replace(pattern, (match, _type: string, targetId: string) => {
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
  const pattern = createPersistedMentionRegex();

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markdown)) !== null) {
    const type = match[1]!.toLowerCase() as MentionType;
    const targetId = match[2]!.toLowerCase();
    const key = `${type}:${targetId}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push({ type, targetId });
    }
  }

  return result;
}

/**
 * Extract mention-like tokens whose target is not a UUID.
 */
export function findInvalidMentionTokens(markdown: string): InvalidMentionToken[] {
  const seen = new Set<string>();
  const result: InvalidMentionToken[] = [];
  const pattern = createMentionTokenRegex();

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markdown)) !== null) {
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

  return result;
}
