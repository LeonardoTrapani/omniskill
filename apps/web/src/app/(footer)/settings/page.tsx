import { requireSession } from "@/lib/auth/require-session";

import SettingsView from "./_components/settings-view";

export default async function SettingsPage() {
  const session = await requireSession("/settings");

  return (
    <SettingsView
      userName={session.user.name ?? "Unnamed user"}
      userEmail={session.user.email ?? "No email"}
    />
  );
}
