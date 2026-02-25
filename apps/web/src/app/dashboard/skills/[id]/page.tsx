import { buildSkillHref } from "@/features/skills/lib/routes";
import { requireSession } from "@/shared/auth/require-session";

import SkillDetail from "./skill-detail";

export default async function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireSession(buildSkillHref(id));

  return <SkillDetail id={id} />;
}
