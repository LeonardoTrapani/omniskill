import { requireSession } from "@/lib/auth/require-session";
import WelcomeWizard from "@/app/(user)/welcome/_components/welcome-wizard";

export default async function WelcomePage() {
  await requireSession("/welcome");

  return <WelcomeWizard />;
}
