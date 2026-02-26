import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { buildLoginHref } from "@/lib/skills/routes";
import { authServerClient } from "@/lib/auth/auth-server";

export async function requireSession(nextPath?: string) {
  const session = await authServerClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect(buildLoginHref(nextPath));
  }

  return session;
}
