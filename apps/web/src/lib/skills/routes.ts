import type { Route } from "next";

export const dashboardRoute = "/vault" as Route;
export const deviceRoute = "/device" as Route;
export const welcomeRoute = "/welcome" as Route;

export function buildSkillHref(skillId: string) {
  const encodedId = encodeURIComponent(skillId);
  return `/vault/skills/${encodedId}` as Route;
}

export function buildResourceHref(skillId: string, resourcePath: string) {
  const encodedPath = encodeResourcePath(resourcePath);

  return `${buildSkillHref(skillId)}/resources/${encodedPath}` as Route;
}

export function buildResourceTabHref(skillId: string, resourcePath: string) {
  const query = new URLSearchParams({ resource: resourcePath });
  return `${buildSkillHref(skillId)}?${query.toString()}` as Route;
}

export function buildResourceResponsiveHref(
  skillId: string,
  resourcePath: string,
  isDesktopLg: boolean,
) {
  return isDesktopLg
    ? buildResourceTabHref(skillId, resourcePath)
    : buildResourceHref(skillId, resourcePath);
}

export function buildLoginHref(nextPath?: string) {
  if (!nextPath) {
    return "/login" as Route;
  }

  return `/login?next=${encodeURIComponent(nextPath)}` as Route;
}

function encodeResourcePath(resourcePath: string) {
  return resourcePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function buildDeviceAuthorizationHref(userCode?: string) {
  if (!userCode) {
    return deviceRoute;
  }

  return `${deviceRoute}?user_code=${encodeURIComponent(userCode)}` as Route;
}
