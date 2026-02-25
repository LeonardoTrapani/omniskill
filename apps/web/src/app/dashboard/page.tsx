import { requireSession } from "@/shared/auth/require-session";
import { DashboardView } from "@/features/dashboard";

export default async function DashboardPage() {
  await requireSession();

  return <DashboardView />;
}
