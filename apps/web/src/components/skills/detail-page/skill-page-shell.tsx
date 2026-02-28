import type { ReactNode } from "react";

import { GridBackground } from "@/components/ui/grid-background";

export function SkillPageShell({
  children,
  maxWidthClass = "max-w-7xl",
}: {
  children: ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <main className="relative min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
      <GridBackground intensity={72} className="opacity-30" />
      <div className={`relative mx-auto ${maxWidthClass}`}>{children}</div>
    </main>
  );
}
