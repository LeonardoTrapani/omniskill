import type { Route } from "next";

export const dashboardRoute = "/dashboard" as Route;
export const deviceRoute = "/device" as Route;

export function buildSkillHref(skillId: string) {
  const encodedId = encodeURIComponent(skillId);
  return `/dashboard/skills/${encodedId}` as Route;
}

export function buildSkillEditHref(skillId: string) {
  return `${buildSkillHref(skillId)}/edit` as Route;
}

export function buildResourceHref(skillId: string, resourcePath: string) {
  const encodedPath = resourcePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${buildSkillHref(skillId)}/resources/${encodedPath}` as Route;
}

export function buildLoginHref(nextPath?: string) {
  if (!nextPath) {
    return "/login" as Route;
  }

  return `/login?next=${encodeURIComponent(nextPath)}` as Route;
}

export function buildDeviceAuthorizationHref(userCode?: string) {
  if (!userCode) {
    return deviceRoute;
  }

  return `${deviceRoute}?user_code=${encodeURIComponent(userCode)}` as Route;
}

export function resolveEditorNavigationHref(skillId: string, href: string): Route | null {
  if (!href.startsWith("/")) {
    return null;
  }

  const url = new URL(href, "http://localhost");
  const skillHref = buildSkillHref(skillId);
  const editHref = buildSkillEditHref(skillId);

  if (url.pathname === dashboardRoute) {
    return dashboardRoute;
  }

  if (url.pathname === skillHref) {
    return skillHref;
  }

  if (url.pathname === editHref) {
    return editHref;
  }

  const resourcePrefix = `${skillHref}/resources/`;
  if (url.pathname.startsWith(resourcePrefix)) {
    const encodedPath = url.pathname.slice(resourcePrefix.length);
    if (!encodedPath) {
      return null;
    }

    const decodedPath = encodedPath
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
      .join("/");

    if (!decodedPath) {
      return null;
    }

    return buildResourceHref(skillId, decodedPath);
  }

  return null;
}
