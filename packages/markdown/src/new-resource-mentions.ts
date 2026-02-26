const NEW_RESOURCE_MENTION_RE = new RegExp(
  String.raw`(?<!\\)\[\[resource:new:([^\]\n]+)\]\]`,
  "gi",
);

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
  const pattern = new RegExp(NEW_RESOURCE_MENTION_RE.source, "gi");

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    const normalizedPath = normalizeResourcePath(match[1] ?? "");

    if (!seen.has(normalizedPath)) {
      seen.add(normalizedPath);
      paths.push(normalizedPath);
    }
  }

  return paths;
}

export function stripNewResourceMentionsForCreate(markdown: string): string {
  const pattern = new RegExp(NEW_RESOURCE_MENTION_RE.source, "gi");
  return markdown.replace(
    pattern,
    (_match, resourcePath: string) => `\`${normalizeResourcePath(resourcePath)}\``,
  );
}

export function resolveNewResourceMentionsToUuids(
  markdown: string,
  resourceIdByPath: ReadonlyMap<string, string>,
): { markdown: string; missingPaths: string[] } {
  const missing = new Set<string>();
  const pattern = new RegExp(NEW_RESOURCE_MENTION_RE.source, "gi");

  const resolvedMarkdown = markdown.replace(pattern, (match, resourcePath: string) => {
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
