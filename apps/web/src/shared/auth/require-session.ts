import "server-only";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authServerClient } from "@/shared/auth/auth-server";

function buildLoginHref(nextPath?: string) {
  if (!nextPath) {
    return "/login" as Route;
  }

  return `/login?next=${encodeURIComponent(nextPath)}` as Route;
}

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
