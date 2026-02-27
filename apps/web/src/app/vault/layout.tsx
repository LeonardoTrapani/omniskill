import { redirect } from "next/navigation";

import { getCurrentSession, hasCompletedOnboarding } from "@/lib/auth/require-session";
import { welcomeRoute } from "@/lib/skills/routes";

export default async function VaultLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();

  if (session?.user && !hasCompletedOnboarding(session)) {
    redirect(welcomeRoute);
  }

  return children;
}
