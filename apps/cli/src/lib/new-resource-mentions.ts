const NEW_RESOURCE_MENTION_RE = new RegExp(
  String.raw`\\?\[\\?\[(skill|resource):new:([^\]\n]+)\\?\]\\?\]`,
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

  let match: RegExpExecArray | null;
  NEW_RESOURCE_MENTION_RE.lastIndex = 0;

  while ((match = NEW_RESOURCE_MENTION_RE.exec(markdown)) !== null) {
    const normalizedPath = normalizeResourcePath(match[2]!);
    if (!seen.has(normalizedPath)) {
      seen.add(normalizedPath);
      paths.push(normalizedPath);
    }
  }

  return paths;
}

export function stripNewResourceMentionsForCreate(markdown: string): string {
  return markdown.replace(
    NEW_RESOURCE_MENTION_RE,
    (_match, _type: string, resourcePath: string) => {
      return `\`${normalizeResourcePath(resourcePath)}\``;
    },
  );
}

export function resolveNewResourceMentionsToUuids(
  markdown: string,
  resourceIdByPath: ReadonlyMap<string, string>,
): { markdown: string; missingPaths: string[] } {
  const missing = new Set<string>();

  const resolvedMarkdown = markdown.replace(
    NEW_RESOURCE_MENTION_RE,
    (match, _type: string, resourcePath: string) => {
      const normalizedPath = normalizeResourcePath(resourcePath);
      const resourceId = resourceIdByPath.get(normalizedPath);

      if (!resourceId) {
        missing.add(normalizedPath);
        return match;
      }

      return `[[resource:${resourceId.toLowerCase()}]]`;
    },
  );

  return {
    markdown: resolvedMarkdown,
    missingPaths: [...missing],
  };
}
