export type SkillType = "ai-created" | "ai-modified" | "raw";

export function classifySkill(skill: {
  sourceIdentifier?: string | null;
  metadata?: { source?: string } | null;
}): SkillType {
  if (skill.sourceIdentifier === "ai-chat") return "ai-created";
  if (skill.metadata?.source === "ai-chat") return "ai-modified";
  return "raw";
}

export const SKILL_TYPE_LABELS: Record<SkillType, string> = {
  raw: "Raw",
  "ai-modified": "Edited",
  "ai-created": "Custom",
};

export const SKILL_TYPE_COLORS: Record<SkillType, { dot: string; bg: string; text: string }> = {
  raw: {
    dot: "bg-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-500",
  },
  "ai-modified": {
    dot: "bg-yellow-500",
    bg: "bg-yellow-500/10",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  "ai-created": {
    dot: "bg-purple-500",
    bg: "bg-purple-500/10",
    text: "text-purple-500",
  },
};
