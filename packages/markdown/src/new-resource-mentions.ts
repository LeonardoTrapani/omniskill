import { transformOutsideMarkdownCode } from "./transform-outside-markdown-code";

const NEW_RESOURCE_MENTION_RE = new RegExp(
  String.raw`(?<!\\)\[\[resource:new:([^\]\n]+)\]\]`,
  "gi",
);

function replaceOutsideMarkdownCode(
  markdown: string,
  mentionPattern: RegExp,
  replacer: (match: string, resourcePath: string) => string,
): string {
  const pattern = new RegExp(mentionPattern.source, "gi");

  return transformOutsideMarkdownCode(markdown, (segment) => {
    return segment.replace(pattern, replacer);
  });
}

function collectMentionPaths(markdown: string, mentionPattern: RegExp): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];
  const pattern = new RegExp(mentionPattern.source, "gi");

  transformOutsideMarkdownCode(markdown, (segment) => {
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(segment)) !== null) {
      const normalizedPath = normalizeResourcePath(match[1] ?? "");

      if (!seen.has(normalizedPath)) {
        seen.add(normalizedPath);
        paths.push(normalizedPath);
      }
    }

    return segment;
  });

  return paths;
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
  return collectMentionPaths(markdown, NEW_RESOURCE_MENTION_RE);
}

export function stripNewResourceMentionsForCreate(markdown: string): string {
  return replaceOutsideMarkdownCode(
    markdown,
    NEW_RESOURCE_MENTION_RE,
    (_match, resourcePath) => `\`${normalizeResourcePath(resourcePath)}\``,
  );
}

export function resolveNewResourceMentionsToUuids(
  markdown: string,
  resourceIdByPath: ReadonlyMap<string, string>,
): { markdown: string; missingPaths: string[] } {
  const missing = new Set<string>();

  const resolvedMarkdown = replaceOutsideMarkdownCode(
    markdown,
    NEW_RESOURCE_MENTION_RE,
    (match, resourcePath) => {
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
