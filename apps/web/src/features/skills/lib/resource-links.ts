import { buildResourceHref } from "@/features/skills/lib/routes";

export interface SkillResourceReference {
  id: string;
  path: string;
  kind: string;
  content: string;
  updatedAt: string | Date;
}

function decodeHref(input: string) {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function createResourceHrefResolver(resources: SkillResourceReference[]) {
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  const resourcesByPath = new Map(resources.map((resource) => [resource.path, resource]));

  return (href: string) => {
    const decodedHref = decodeHref(href);

    if (decodedHref.startsWith("resource://")) {
      const byId = resourcesById.get(decodedHref.replace("resource://", ""));
      if (byId) {
        return byId;
      }
    }

    const byPath = resourcesByPath.get(decodedHref);
    if (byPath) {
      return byPath;
    }

    const bySuffix = resources.find(
      (resource) =>
        decodedHref.endsWith(resource.path) || decodedHref.endsWith(`/${resource.path}`),
    );

    return bySuffix ?? null;
  };
}

export { buildResourceHref };
