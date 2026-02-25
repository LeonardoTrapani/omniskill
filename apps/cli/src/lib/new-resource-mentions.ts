const NEW_RESOURCE_MENTION_RE = new RegExp(
  String.raw`(?<!\\)\[\[(skill|resource):new:([^\]\n]+)\]\]`,
  "gi",
);

function replaceOutsideMarkdownCode(
  markdown: string,
  replacer: (match: string, type: string, resourcePath: string) => string,
): string {
  const lines = markdown.split("\n");
  const mentionPattern = new RegExp(NEW_RESOURCE_MENTION_RE.source, "gi");

  let inFence = false;
  let fenceMarker: "`" | "~" | null = null;

  const transformed = lines.map((line) => {
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

        return part.replace(mentionPattern, replacer);
      })
      .join("");
  });

  return transformed.join("\n");
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

  replaceOutsideMarkdownCode(markdown, (_match, _type: string, resourcePath: string) => {
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
  return replaceOutsideMarkdownCode(markdown, (_match, _type: string, resourcePath: string) => {
    return `\`${normalizeResourcePath(resourcePath)}\``;
  });
}

export function resolveNewResourceMentionsToUuids(
  markdown: string,
  resourceIdByPath: ReadonlyMap<string, string>,
): { markdown: string; missingPaths: string[] } {
  const missing = new Set<string>();

  const resolvedMarkdown = replaceOutsideMarkdownCode(
    markdown,
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
