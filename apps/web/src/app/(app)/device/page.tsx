"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { buildDeviceAuthorizationHref, buildLoginHref } from "@/features/skills/lib/routes";
import { authClient } from "@/shared/auth/auth-client";
import Loader from "@/shared/components/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function normalizeUserCode(input: string | null | undefined) {
  return (input ?? "").trim().replaceAll("-", "").toUpperCase();
}

function formatUserCode(input: string) {
  const normalized = normalizeUserCode(input);
  if (normalized.length <= 4) {
    return normalized;
  }

  return normalized.match(/.{1,4}/g)?.join("-") ?? normalized;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) {
    return fallback;
  }

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

function DeviceAuthorizationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();

  const queryCode = normalizeUserCode(searchParams.get("user_code"));
  const [inputCode, setInputCode] = useState(formatUserCode(queryCode));
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "approving" | "denying">("idle");
  const [result, setResult] = useState<"approved" | "denied" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateCode = useCallback(async (rawCode: string) => {
    const normalizedCode = normalizeUserCode(rawCode);
    if (!normalizedCode) {
      setErrorMessage("enter the code shown in your cli");
      return null;
    }

    setStatus("checking");
    setErrorMessage(null);

    const response = await authClient.device({ query: { user_code: normalizedCode } });
    if (response.error) {
      setStatus("idle");
      setVerifiedCode(null);
      setResult(null);
      setErrorMessage(getErrorMessage(response.error, "that code is invalid or expired"));
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

    if (!queryCode) {
      return;
    }

    void validateCode(queryCode);
  }, [queryCode, validateCode]);

  if (isPending) {
    return <Loader />;
  }

  if (status === "checking") {
    return <Loader />;
  }

  const codeForRedirect = verifiedCode ?? queryCode;
  const loginHref = buildLoginHref(buildDeviceAuthorizationHref(codeForRedirect));

  return (
    <div className="mx-auto mt-10 w-full max-w-md px-4">
      <Card>
        <CardHeader>
          <CardTitle>Device authorization</CardTitle>
          <CardDescription>finish your cli sign-in from the browser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!verifiedCode ? (
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const normalizedCode = await validateCode(inputCode);
                if (!normalizedCode) {
                  return;
                }
                router.replace(buildDeviceAuthorizationHref(normalizedCode));
              }}
            >
              <Input
                value={inputCode}
                onChange={(event) => {
                  setInputCode(formatUserCode(event.target.value));
                }}
                autoComplete="off"
                autoFocus
                placeholder="ABCD-1234"
                maxLength={12}
              />
              <Button type="submit" className="w-full">
                continue
              </Button>
            </form>
          ) : null}

          {verifiedCode && !session ? (
            <div className="space-y-3">
              <p>sign in to approve code {formatUserCode(verifiedCode)}</p>
              <Button
                className="w-full"
                onClick={() => {
                  router.push(loginHref);
                }}
              >
                sign in
              </Button>
            </div>
          ) : null}

          {verifiedCode && session && !result ? (
            <div className="space-y-3">
              <p>
                allow cli access for <strong>{session.user.email}</strong> using code{" "}
                <strong>{formatUserCode(verifiedCode)}</strong>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={async () => {
                    setStatus("approving");
                    setErrorMessage(null);

                    const response = await authClient.device.approve({ userCode: verifiedCode });
                    if (response.error) {
                      setStatus("idle");
                      setErrorMessage(getErrorMessage(response.error, "unable to approve request"));
                      return;
                    }

                    setStatus("idle");
                    setResult("approved");
                  }}
                  disabled={status !== "idle"}
                >
                  {status === "approving" ? "approving..." : "approve"}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setStatus("denying");
                    setErrorMessage(null);

                    const response = await authClient.device.deny({ userCode: verifiedCode });
                    if (response.error) {
                      setStatus("idle");
                      setErrorMessage(getErrorMessage(response.error, "unable to deny request"));
                      return;
                    }

                    setStatus("idle");
                    setResult("denied");
                  }}
                  disabled={status !== "idle"}
                >
                  {status === "denying" ? "denying..." : "deny"}
                </Button>
              </div>
            </div>
          ) : null}

          {result === "approved" ? <p>approved. return to your cli.</p> : null}
          {result === "denied" ? <p>request denied. return to your cli.</p> : null}
          {errorMessage ? <p className="text-red-500">{errorMessage}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeviceAuthorizationPage() {
  return (
    <Suspense fallback={<Loader />}>
      <DeviceAuthorizationContent />
    </Suspense>
  );
}
