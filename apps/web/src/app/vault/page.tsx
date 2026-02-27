import { requireSession } from "@/lib/auth/require-session";
import DashboardView from "@/app/vault/_components/dashboard-view";
import OnboardingGate from "@/app/vault/_components/onboarding-gate";

export default async function DashboardPage() {
  await requireSession();

  return (
    <OnboardingGate>
      <DashboardView />
    </OnboardingGate>
  );
}
