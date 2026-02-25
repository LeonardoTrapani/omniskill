const FALLBACK_VERSION = "dev";

export function getCliVersion() {
  const value = process.env.BETTER_SKILLS_VERSION?.trim();
  return value && value.length > 0 ? value : FALLBACK_VERSION;
}
