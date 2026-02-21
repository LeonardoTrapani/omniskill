"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => {
    const next = searchParams.get("next");
    if (next?.startsWith("/")) {
      return next;
    }
    return "/dashboard";
  }, [searchParams]);

  const [showSignIn, setShowSignIn] = useState(Boolean(searchParams.get("next")));

  return showSignIn ? (
    <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} redirectTo={redirectTo} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} redirectTo={redirectTo} />
  );
}
