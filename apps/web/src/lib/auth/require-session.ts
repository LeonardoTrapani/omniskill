import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { buildLoginHref } from "@/lib/skills/routes";
import { authServerClient } from "@/lib/auth/auth-server";

type Session = Awaited<ReturnType<typeof authServerClient.getSession>>;

export async function getCurrentSession() {
  return authServerClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });
}

export function hasCompletedOnboarding(session: Session) {
  if (!session?.user) {
    return false;
  }

  const user = session.user as typeof session.user & { onboardingCompleted?: boolean };

  return user.onboardingCompleted === true;
}

export async function requireSession(nextPath?: string) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect(buildLoginHref(nextPath));
  }

  return session;
}
