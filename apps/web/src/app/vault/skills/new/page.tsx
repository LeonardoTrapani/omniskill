import { requireSession } from "@/lib/auth/require-session";
import { buildSkillCreateHref } from "@/lib/skills/routes";
import SkillCreate from "./skill-create";

export default async function SkillCreatePage() {
  await requireSession(buildSkillCreateHref());

  return <SkillCreate />;
}
