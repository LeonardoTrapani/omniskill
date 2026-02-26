import { buildSkillEditHref } from "@/lib/skills/routes";
import { requireSession } from "@/lib/auth/require-session";

import SkillEdit from "./skill-edit";

export default async function SkillEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireSession(buildSkillEditHref(id));

  return <SkillEdit id={id} />;
}
