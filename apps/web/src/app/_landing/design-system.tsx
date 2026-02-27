import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function LandingContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative z-10 flex w-full justify-center px-4 sm:px-6 lg:px-0", className)}>
      <div className="flex w-full max-w-[1112px] flex-col">{children}</div>
    </div>
  );
}

export function SectionTailSpacer() {
  return <div className="h-20" aria-hidden="true" />;
}
