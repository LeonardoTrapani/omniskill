"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { ComponentProps } from "react";

import { authClient } from "@/shared/auth/auth-client";
import Loader from "@/shared/components/loader";
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
    return "/dashboard";
  }
  return next;
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const { isPending } = authClient.useSession();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const callbackURL = getSafeCallbackURL(searchParams.get("next"));

  if (isPending) {
    return <Loader />;
  }

  const signInWith = (provider: "google" | "github") => {
    setLoadingProvider(provider);
    authClient.signIn.social({
      provider,
      callbackURL: new URL(callbackURL, window.location.origin).toString(),
    });
  };

  return (
    <main className="relative min-h-[calc(100vh-52px)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_65%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_65%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />

      <section className="relative mx-auto flex min-h-[calc(100vh-52px)] w-full max-w-5xl items-center px-6 py-10 md:px-10">
        <div className="grid w-full border border-border bg-background/90 backdrop-blur-sm lg:grid-cols-[1.2fr_0.9fr]">
          <div className="border-b border-border p-6 sm:p-8 lg:border-r lg:border-b-0 lg:p-10">
            <p className="text-[11px] uppercase text-muted-foreground">Access Node</p>
            <h1 className="mt-4 max-w-lg text-3xl font-semibold leading-tight text-foreground text-balance sm:text-4xl">
              Sign In
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              Continue to your BETTER-SKILLS workspace to manage reusable skills for your agents
              across CLI and web.
            </p>
            {/*
            <div className="mt-7 border border-border bg-muted/20 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Session Preview
              </p>
              <p className="mt-2 font-mono text-xs leading-6 text-foreground/90 break-words">
                &gt; better-skills login
                <br />
                &gt; better-skills config
                <br />
                &gt; better-skills sync
              </p>
            </div> */}
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-[11px] uppercase text-muted-foreground">Login</p>
            <p className="mt-2 text-sm text-muted-foreground">Choose a provider to continue.</p>

            <div className="mt-6 space-y-3">
              <Button
                variant="outline"
                className="h-11 w-full gap-3"
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
                className="h-11 w-full gap-3"
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

            <p className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
              You will be redirected back to your dashboard after authentication.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginPageContent />
    </Suspense>
  );
}
