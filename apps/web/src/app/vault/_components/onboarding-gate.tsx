"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/api/trpc";
import { welcomeRoute } from "@/lib/skills/routes";
import Loader from "@/components/loader";

const ONBOARDING_DONE_KEY = "better-skills:onboarding-done";

export function isOnboardingDone() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_DONE_KEY) === "true";
}

export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_DONE_KEY, "true");
}

/**
 * Client-side gate that redirects new users to `/welcome`.
 *
 * Activation is derived from existing data:
 * - localStorage flag (fast, per-browser)
 * - server check: user has at least one non-default skill
 *
 * If both say "not activated" -> redirect to /welcome.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Fast path: skip server call if localStorage says done
  const localDone = typeof window !== "undefined" && isOnboardingDone();

  const { data, isLoading } = useQuery({
    ...trpc.hasActivated.queryOptions(),
    enabled: !localDone,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (localDone) return;
    if (isLoading) return;

    if (data?.activated) {
      // Server says activated, sync localStorage
      markOnboardingDone();
      return;
    }

    // Not activated -> redirect to onboarding
    router.replace(welcomeRoute);
  }, [localDone, isLoading, data, router]);

  // Fast path: localStorage says done, render immediately
  if (localDone) {
    return <>{children}</>;
  }

  // Waiting for server check
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-52px)] items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

  // Server says activated -> render
  if (data?.activated) {
    return <>{children}</>;
  }

  // Redirecting...
  return (
    <div className="flex min-h-[calc(100vh-52px)] items-center justify-center bg-background">
      <Loader />
    </div>
  );
}
