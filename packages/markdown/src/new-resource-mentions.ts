import { transformOutsideMarkdownCode } from "./transform-outside-markdown-code";

const NEW_RESOURCE_MENTION_RE = new RegExp(
  String.raw`(?<!\\)\[\[(skill|resource):new:([^\]\n]+)\]\]`,
  "gi",
);

function replaceOutsideMarkdownCode(
  markdown: string,
  replacer: (match: string, type: string, resourcePath: string) => string,
): string {
  const mentionPattern = new RegExp(NEW_RESOURCE_MENTION_RE.source, "gi");

  return transformOutsideMarkdownCode(markdown, (segment) => {
    return segment.replace(mentionPattern, replacer);
  });
}

export function normalizeResourcePath(path: string): string {
  let normalized = path.trim();

  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }

  normalized = normalized.replace(/\\/g, "/");

  const hashIndex = normalized.indexOf("#");
  if (hashIndex >= 0) {
    normalized = normalized.slice(0, hashIndex);
  }

  const queryIndex = normalized.indexOf("?");
  if (queryIndex >= 0) {
    normalized = normalized.slice(0, queryIndex);
  }

  while (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }

  return normalized;
}

export function collectNewResourceMentionPaths(markdown: string): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];

  replaceOutsideMarkdownCode(markdown, (_match, _type, resourcePath) => {
    const normalizedPath = normalizeResourcePath(resourcePath);
    if (!seen.has(normalizedPath)) {
      seen.add(normalizedPath);
      paths.push(normalizedPath);
    }
    return _match;
  });

  return paths;
}

export function stripNewResourceMentionsForCreate(markdown: string): string {
  return replaceOutsideMarkdownCode(markdown, (_match, _type, resourcePath) => {
    return `\`${normalizeResourcePath(resourcePath)}\``;
  });
}

export function resolveNewResourceMentionsToUuids(
  markdown: string,
  resourceIdByPath: ReadonlyMap<string, string>,
): { markdown: string; missingPaths: string[] } {
  const missing = new Set<string>();

  const resolvedMarkdown = replaceOutsideMarkdownCode(markdown, (match, _type, resourcePath) => {
    const normalizedPath = normalizeResourcePath(resourcePath);
    const resourceId = resourceIdByPath.get(normalizedPath);

    if (!resourceId) {
      missing.add(normalizedPath);
      return match;
    }

    return `[[resource:${resourceId.toLowerCase()}]]`;
  });

  return {
    markdown: resolvedMarkdown,
    missingPaths: [...missing],
  };
}
