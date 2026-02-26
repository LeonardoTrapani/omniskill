"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, TerminalSquare, XCircle } from "lucide-react";

import { buildDeviceAuthorizationHref, buildLoginHref } from "@/lib/skills/routes";
import { authClient } from "@/lib/auth/auth-client";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function normalizeUserCode(input: string | null | undefined) {
  return (input ?? "").trim().replaceAll("-", "").toUpperCase();
}

function formatUserCode(input: string) {
  const normalized = normalizeUserCode(input);
  if (normalized.length <= 4) return normalized;
  return normalized.match(/.{1,4}/g)?.join("-") ?? normalized;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) return fallback;

  const candidate = error as {
    error_description?: string;
    message?: string;
    error?: {
      message?: string;
      statusText?: string;
      error_description?: string;
    };
  };

  return (
    candidate.error?.error_description ??
    candidate.error?.message ??
    candidate.error?.statusText ??
    candidate.error_description ??
    candidate.message ??
    fallback
  );
}

function DeviceLoadingState() {
  return (
    <main className="relative min-h-[calc(100vh-52px)] bg-background">
      <div className="mx-auto flex min-h-[calc(100vh-52px)] max-w-3xl items-center justify-center px-4 py-10 sm:px-6">
        <Loader />
      </div>
    </main>
  );
}

function DeviceAuthorizationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();

  const [hydrated, setHydrated] = useState(false);
  const queryCode = normalizeUserCode(searchParams.get("user_code"));
  const [inputCode, setInputCode] = useState(formatUserCode(queryCode));
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "approving" | "denying">("idle");
  const [result, setResult] = useState<"approved" | "denied" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const validateCode = useCallback(async (rawCode: string) => {
    const normalizedCode = normalizeUserCode(rawCode);
    if (!normalizedCode) {
      setErrorMessage("Enter the code shown in your CLI.");
      return null;
    }

    setStatus("checking");
    setErrorMessage(null);

    const response = await authClient.device({ query: { user_code: normalizedCode } });
    if (response.error) {
      setStatus("idle");
      setVerifiedCode(null);
      setResult(null);
      setErrorMessage(getErrorMessage(response.error, "That code is invalid or expired."));
      return null;
    }

    setStatus("idle");
    setVerifiedCode(normalizedCode);
    return normalizedCode;
  }, []);

  useEffect(() => {
    setInputCode(formatUserCode(queryCode));
    setVerifiedCode(null);
    setResult(null);
    setErrorMessage(null);

    if (!queryCode) return;
    void validateCode(queryCode);
  }, [queryCode, validateCode]);

  if (!hydrated || isPending || status === "checking") {
    return <DeviceLoadingState />;
  }

  const codeForRedirect = verifiedCode ?? queryCode;
  const loginHref = buildLoginHref(buildDeviceAuthorizationHref(codeForRedirect));

  return (
    <main className="relative min-h-[calc(100vh-52px)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_65%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_65%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-30" />

      <section className="relative mx-auto flex min-h-[calc(100vh-52px)] w-full max-w-3xl items-center px-4 py-10 sm:px-6">
        <Card className="w-full border border-border bg-background/90 backdrop-blur-sm">
          <CardHeader className="border-b border-border pb-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-primary">
              Device Login
            </p>
            <CardTitle className="text-xl font-semibold text-foreground">Authorize CLI</CardTitle>
            <CardDescription>
              Confirm the device code to continue signing in from your browser.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {!verifiedCode ? (
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const normalizedCode = await validateCode(inputCode);
                  if (!normalizedCode) return;
                  router.replace(buildDeviceAuthorizationHref(normalizedCode));
                }}
              >
                <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
                  User code
                </label>
                <Input
                  value={inputCode}
                  onChange={(event) => setInputCode(formatUserCode(event.target.value))}
                  autoComplete="off"
                  autoFocus
                  placeholder="ABCD-1234"
                  maxLength={12}
                  className="font-mono"
                />
                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
            ) : null}

            {verifiedCode && !session ? (
              <div className="space-y-3 border border-border px-4 py-4">
                <p className="text-sm text-foreground">
                  Sign in to approve code{" "}
                  <span className="font-mono">{formatUserCode(verifiedCode)}</span>.
                </p>
                <Button className="w-full" onClick={() => router.push(loginHref)}>
                  Sign in
                </Button>
              </div>
            ) : null}

            {verifiedCode && session && !result ? (
              <div className="space-y-3 border border-border px-4 py-4">
                <div className="space-y-1.5">
                  <p className="inline-flex items-center gap-2 text-sm text-foreground">
                    <TerminalSquare className="size-4 text-muted-foreground" aria-hidden="true" />
                    Request from CLI
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Allow access for{" "}
                    <span className="font-medium text-foreground">{session.user.email}</span> using
                    code{" "}
                    <span className="font-mono text-foreground">
                      {formatUserCode(verifiedCode)}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={async () => {
                      setStatus("approving");
                      setErrorMessage(null);

                      const response = await authClient.device.approve({ userCode: verifiedCode });
                      if (response.error) {
                        setStatus("idle");
                        setErrorMessage(
                          getErrorMessage(response.error, "Unable to approve request."),
                        );
                        return;
                      }

                      setStatus("idle");
                      setResult("approved");
                    }}
                    disabled={status !== "idle"}
                  >
                    {status === "approving" ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setStatus("denying");
                      setErrorMessage(null);

                      const response = await authClient.device.deny({ userCode: verifiedCode });
                      if (response.error) {
                        setStatus("idle");
                        setErrorMessage(getErrorMessage(response.error, "Unable to deny request."));
                        return;
                      }

                      setStatus("idle");
                      setResult("denied");
                    }}
                    disabled={status !== "idle"}
                  >
                    {status === "denying" ? "Denying..." : "Deny"}
                  </Button>
                </div>
              </div>
            ) : null}

            {result === "approved" ? (
              <p className="inline-flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                Approved. Return to your CLI.
              </p>
            ) : null}

            {result === "denied" ? (
              <p className="inline-flex items-center gap-2 text-sm text-foreground">
                <XCircle className="size-4 text-destructive" aria-hidden="true" />
                Request denied. Return to your CLI.
              </p>
            ) : null}

            {!result ? (
              <div className="border-t border-dashed border-border pt-3">
                <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Never approve a code you did not request yourself.
                </p>
              </div>
            ) : null}

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default function DeviceAuthorizationPage() {
  return (
    <Suspense fallback={<DeviceLoadingState />}>
      <DeviceAuthorizationContent />
    </Suspense>
  );
}
