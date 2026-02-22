import { classifySkill, SKILL_TYPE_LABELS, SKILL_TYPE_COLORS } from "@/lib/classify-skill";

interface SkillTypeBadgeProps {
  skill: {
    sourceIdentifier?: string | null;
    metadata?: { source?: string } | null;
  };
}

export default function SkillTypeBadge({ skill }: SkillTypeBadgeProps) {
  const type = classifySkill(skill);
  const colors = SKILL_TYPE_COLORS[type];
  const label = SKILL_TYPE_LABELS[type];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] ${colors.bg} ${colors.text} px-1.5 py-0.5 border border-transparent`}
    >
      <span className={`size-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
}
