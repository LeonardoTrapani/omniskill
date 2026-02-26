import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";

export function SkillPageErrorState({
  message,
  href,
  ctaLabel,
  maxWidthClass = "max-w-7xl",
}: {
  message: string;
  href: Route;
  ctaLabel: string;
  maxWidthClass?: string;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
      <div
        className={`mx-auto flex w-full ${maxWidthClass} flex-col items-center justify-center gap-4 py-32`}
      >
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link href={href}>
          <Button variant="outline" size="sm">
            {ctaLabel}
          </Button>
        </Link>
      </div>
    </main>
  );
}
