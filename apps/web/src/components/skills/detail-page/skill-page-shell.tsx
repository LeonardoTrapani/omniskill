import type { ReactNode } from "react";

export function SkillPageShell({
  children,
  maxWidthClass = "max-w-7xl",
}: {
  children: ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <main className="relative min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-30" />
      <div className={`relative mx-auto ${maxWidthClass}`}>{children}</div>
    </main>
  );
}
