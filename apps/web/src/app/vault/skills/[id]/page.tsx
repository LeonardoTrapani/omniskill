import { buildSkillHref } from "@/lib/skills/routes";
import { requireSession } from "@/lib/auth/require-session";

import SkillDetail from "./skill-detail";

export default async function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireSession(buildSkillHref(id));

  return <SkillDetail id={id} />;
}
