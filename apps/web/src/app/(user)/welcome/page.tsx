import { redirect } from "next/navigation";

import { hasCompletedOnboarding, requireSession } from "@/lib/auth/require-session";
import { dashboardRoute } from "@/lib/skills/routes";
import WelcomeWizard from "@/app/(user)/welcome/_components/welcome-wizard";

export default async function WelcomePage() {
  const session = await requireSession("/welcome");

  if (hasCompletedOnboarding(session)) {
    redirect(dashboardRoute);
  }

  return <WelcomeWizard />;
}
