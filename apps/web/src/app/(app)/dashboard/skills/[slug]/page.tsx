import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import SkillDetail from "./skill-detail";

export default async function SkillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/skills/${slug}`)}`);
  }

  return <SkillDetail slug={slug} />;
}
