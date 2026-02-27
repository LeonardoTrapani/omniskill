"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/api/trpc";
import { welcomeRoute } from "@/lib/skills/routes";
import Loader from "@/components/loader";

/**
 * Client-side gate that redirects new users to `/welcome`.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { data, isLoading, isFetching } = useQuery({
    ...trpc.hasActivated.queryOptions(),
    staleTime: 60_000,
  });

  const checkingActivation = isLoading || isFetching;

  useEffect(() => {
    if (checkingActivation) return;
    if (data?.activated) return;

    router.replace(welcomeRoute);
  }, [checkingActivation, data, router]);

  if (checkingActivation) {
    return (
      <div className="flex min-h-[calc(100vh-52px)] items-center justify-center bg-background">
        <Loader />
      </div>
    );
  }

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
