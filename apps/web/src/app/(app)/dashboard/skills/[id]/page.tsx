import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import SkillDetail from "./skill-detail";

export default async function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/skills/${id}`)}`);
  }

  return <SkillDetail id={id} />;
}
