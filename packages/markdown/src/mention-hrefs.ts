import {
  formatPersistedMentionQuery,
  parsePersistedMentionQuery,
  type Mention,
  type MentionType,
} from "./persisted-mentions";

const DEFAULT_SKILLS_PREFIX = "/vault/skills";

function encodeResourcePath(resourcePath: string): string {
  return resourcePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function normalizeSkillsPrefix(prefix?: string): string {
  const value = (prefix ?? DEFAULT_SKILLS_PREFIX).trim();
  if (value.length === 0) {
    return DEFAULT_SKILLS_PREFIX;
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function buildMentionQuery(type: MentionType, targetId: string): string {
  const params = new URLSearchParams({ mention: formatPersistedMentionQuery(type, targetId) });
  return `?${params.toString()}`;
}

export function parseMentionQuery(queryValue: string): Mention | null {
  return parsePersistedMentionQuery(queryValue);
}

export function buildSkillMentionHref(
  skillId: string,
  options?: {
    skillsPrefix?: string;
  },
): string {
  const normalizedSkillId = skillId.toLowerCase();
  const skillsPrefix = normalizeSkillsPrefix(options?.skillsPrefix);
  return `${skillsPrefix}/${encodeURIComponent(normalizedSkillId)}${buildMentionQuery("skill", normalizedSkillId)}`;
}

export function buildResourceMentionHref(
  skillId: string,
  resourcePath: string,
  resourceId: string,
  options?: {
    skillsPrefix?: string;
  },
): string {
  const normalizedSkillId = skillId.toLowerCase();
  const normalizedResourceId = resourceId.toLowerCase();
  const skillsPrefix = normalizeSkillsPrefix(options?.skillsPrefix);
  const encodedPath = encodeResourcePath(resourcePath);

  return `${skillsPrefix}/${encodeURIComponent(normalizedSkillId)}/resources/${encodedPath}${buildMentionQuery("resource", normalizedResourceId)}`;
}
