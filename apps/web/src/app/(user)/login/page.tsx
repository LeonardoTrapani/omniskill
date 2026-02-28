"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { ShieldCheck } from "lucide-react";

import { GridBackground } from "@/components/ui/grid-background";
import { authClient } from "@/lib/auth/auth-client";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";

function GitHubIcon({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function GoogleIcon({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...props}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getSafeCallbackURL(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/vault";
  }
  return next;
}

function LoginLoadingState() {
  return (
    <main className="relative min-h-[calc(100vh-52px)] bg-background">
      <div className="mx-auto flex min-h-[calc(100vh-52px)] max-w-3xl items-center justify-center px-6 py-10">
        <Loader />
      </div>
    </main>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const { isPending } = authClient.useSession();
  const [isHydrated, setIsHydrated] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const callbackURL = getSafeCallbackURL(searchParams.get("next"));

  if (!isHydrated || isPending) {
    return <LoginLoadingState />;
  }

  const signInWith = (provider: "google" | "github") => {
    setLoadingProvider(provider);
    authClient.signIn.social({
      provider,
      callbackURL: new URL(callbackURL, window.location.origin).toString(),
    });
  };

  return (
    <main className="relative min-h-[calc(100vh-52px)] bg-background">
      <GridBackground intensity={72} className="opacity-20" />

      <div className="relative mx-auto flex min-h-[calc(100vh-52px)] w-full max-w-xl items-center px-4 py-10 sm:px-6">
        <div className="w-full space-y-6">
          {/* ── Header ── */}
          <header>
            <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-primary">
              // Authentication \\
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Sign in
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Continue to your workspace to manage skills, resources, and graph links.
            </p>
          </header>

          {/* ── Auth card — settings Section pattern ── */}
          <div className="border border-border bg-background">
            <div className="border-b border-border px-5 py-5 space-y-2">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-semibold uppercase font-mono text-foreground">
                  Provider
                </h2>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Choose an authentication provider to access your vault.
              </p>
            </div>

            <div className="px-5 py-5 space-y-3">
              <Button
                variant="outline"
                className="h-11 w-full justify-start gap-3 px-4 text-sm"
                disabled={loadingProvider !== null}
                onClick={() => signInWith("google")}
              >
                {loadingProvider === "google" ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <GoogleIcon className="h-5 w-5" aria-hidden="true" />
                )}
                Continue with Google
              </Button>

              <Button
                variant="outline"
                className="h-11 w-full justify-start gap-3 px-4 text-sm"
                disabled={loadingProvider !== null}
                onClick={() => signInWith("github")}
              >
                {loadingProvider === "github" ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <GitHubIcon className="h-5 w-5" aria-hidden="true" />
                )}
                Continue with GitHub
              </Button>
            </div>
          </div>

          {/* ── Footer note ── */}
          <p className="inline-flex items-center gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            After authentication you will be redirected to your vault.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginPageContent />
    </Suspense>
  );
}
