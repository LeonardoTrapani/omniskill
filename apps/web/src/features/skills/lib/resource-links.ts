import { getHrefPath, parseMentionHref } from "@/features/skills/components/mention-markdown";
import { buildResourceHref } from "@/features/skills/lib/routes";

export interface SkillResourceReference {
  id: string;
  path: string;
  kind: string;
  content: string;
  updatedAt: string | Date;
}

export function createResourceHrefResolver(resources: SkillResourceReference[]) {
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  const resourcesByPath = new Map(resources.map((resource) => [resource.path, resource]));

  return (href: string) => {
    const mention = parseMentionHref(href);
    if (mention?.type === "resource") {
      const byId = resourcesById.get(mention.targetId);
      if (byId) return byId;
    }

    const normalizedPath = getHrefPath(href);
    if (normalizedPath) {
      const byPath = resourcesByPath.get(normalizedPath);
      if (byPath) return byPath;

      const bySuffix = resources.find(
        (resource) =>
          normalizedPath.endsWith(resource.path) || normalizedPath.endsWith(`/${resource.path}`),
      );
      if (bySuffix) return bySuffix;
    }

    return null;
  };
}

export { buildResourceHref };
