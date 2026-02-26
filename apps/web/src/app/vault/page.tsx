import { requireSession } from "@/lib/auth/require-session";
import DashboardView from "@/app/vault/_components/dashboard-view";

export default async function DashboardPage() {
  await requireSession();

  return <DashboardView />;
}
