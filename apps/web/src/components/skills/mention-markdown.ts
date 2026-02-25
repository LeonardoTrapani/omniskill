const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const MENTION_QUERY_RE = new RegExp(`^(skill|resource):(${UUID_RE})$`, "i");
const SCHEME_RE = /^[a-z][a-z\d+\-.]*:/i;

type MentionType = "skill" | "resource";

interface MentionTarget {
  type: MentionType;
  targetId: string;
}

function getMentionTokenRegex() {
  return new RegExp(`\\\\?\\[\\\\?\\[(skill|resource):(${UUID_RE})\\\\?\\]\\\\?\\]`, "gi");
}

function decodeMaybe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeHref(rawHref: string) {
  return decodeMaybe(rawHref.trim());
}

function parseHref(rawHref: string) {
  const href = normalizeHref(rawHref);

  if (/^https?:\/\//i.test(href)) {
    try {
      const parsed = new URL(href);
      return {
        path: decodeMaybe(parsed.pathname),
        query: parsed.search.startsWith("?") ? parsed.search.slice(1) : parsed.search,
        hash: parsed.hash,
        searchParams: parsed.searchParams,
        isAbsoluteHttp: true,
      };
    } catch {
      return null;
    }
  }

  if (SCHEME_RE.test(href)) {
    return null;
  }

  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf("?");
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";

  return {
    path: decodeMaybe(path),
    query,
    hash,
    searchParams: new URLSearchParams(query),
    isAbsoluteHttp: false,
  };
}

export function getHrefPath(rawHref: string): string | null {
  const parsed = parseHref(rawHref);
  if (!parsed || parsed.isAbsoluteHttp) return null;
  return parsed?.path ?? null;
}

export function getInternalDashboardHref(rawHref: string): string | null {
  const parsed = parseHref(rawHref);
  if (!parsed) return null;
  if (parsed.isAbsoluteHttp) return null;
  if (!parsed.path.startsWith("/dashboard/skills/")) return null;

  const query = parsed.query ? `?${parsed.query}` : "";
  return `${parsed.path}${query}${parsed.hash}`;
}

export function parseMentionHref(rawHref: string): MentionTarget | null {
  const parsed = parseHref(rawHref);
  if (!parsed) return null;
  if (parsed.isAbsoluteHttp) return null;
  if (!parsed.path.startsWith("/dashboard/skills/")) return null;

  const mention = parsed.searchParams.get("mention");
  if (!mention) return null;

  const mentionMatch = MENTION_QUERY_RE.exec(mention);
  if (!mentionMatch) return null;

  const type = mentionMatch[1]!.toLowerCase() as MentionType;
  const targetId = mentionMatch[2]!.toLowerCase();
  return { type, targetId };
}

function buildMentionQuery(type: MentionType, targetId: string) {
  const params = new URLSearchParams({ mention: `${type}:${targetId}` });
  return `?${params.toString()}`;
}

export function buildSkillMentionHref(skillId: string) {
  const normalizedSkillId = skillId.toLowerCase();
  return `/dashboard/skills/${encodeURIComponent(normalizedSkillId)}${buildMentionQuery("skill", normalizedSkillId)}`;
}

export function buildResourceMentionHref(
  skillId: string,
  resourcePath: string,
  resourceId: string,
) {
  const normalizedSkillId = skillId.toLowerCase();
  const normalizedResourceId = resourceId.toLowerCase();
  const encodedPath = resourcePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `/dashboard/skills/${encodeURIComponent(normalizedSkillId)}/resources/${encodedPath}${buildMentionQuery("resource", normalizedResourceId)}`;
}

function normalizeLabel(label: string) {
  const trimmed = label.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function escapeMarkdownLinkLabel(label: string) {
  return label
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ");
}

export function storageMarkdownToEditorMarkdown(options: {
  originalMarkdown: string;
  renderedMarkdown?: string | null;
}) {
  const { originalMarkdown, renderedMarkdown } = options;

  const skillLinkById = new Map<string, { label: string; href: string }>();
  const resourceLinkById = new Map<string, { label: string; href: string }>();

  if (renderedMarkdown) {
    MARKDOWN_LINK_REGEX.lastIndex = 0;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = MARKDOWN_LINK_REGEX.exec(renderedMarkdown)) !== null) {
      const label = normalizeLabel(linkMatch[1]!);
      const href = normalizeHref(linkMatch[2]!);
      const mention = parseMentionHref(href);

      if (!mention) continue;

      if (mention.type === "skill" && !skillLinkById.has(mention.targetId)) {
        skillLinkById.set(mention.targetId, { label, href });
      }

      if (mention.type === "resource" && !resourceLinkById.has(mention.targetId)) {
        resourceLinkById.set(mention.targetId, { label, href });
      }
    }
  }

  const mentionTokenRegex = getMentionTokenRegex();

  return originalMarkdown.replace(mentionTokenRegex, (_match, rawType: string, rawId: string) => {
    const type = rawType.toLowerCase() as MentionType;
    const targetId = rawId.toLowerCase();

    const link = type === "skill" ? skillLinkById.get(targetId) : resourceLinkById.get(targetId);

    if (!link) {
      return `[[${type}:${targetId}]]`;
    }

    return `[${escapeMarkdownLinkLabel(link.label)}](${link.href})`;
  });
}

export function editorMarkdownToStorageMarkdown(editorMarkdown: string) {
  const mentionTokenRegex = getMentionTokenRegex();

  const linkedMentions = editorMarkdown.replace(
    MARKDOWN_LINK_REGEX,
    (match, _label: string, href: string) => {
      const mention = parseMentionHref(href);
      if (!mention) return match;
      return `[[${mention.type}:${mention.targetId}]]`;
    },
  );

  return linkedMentions.replace(mentionTokenRegex, (_match, rawType: string, rawId: string) => {
    const type = rawType.toLowerCase();
    const targetId = rawId.toLowerCase();
    return `[[${type}:${targetId}]]`;
  });
}
