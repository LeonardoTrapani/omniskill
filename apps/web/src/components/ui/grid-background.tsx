import { cn } from "@/lib/utils";

interface GridBackgroundProps {
  className?: string;
  /** border color-mix percentage (default 74) */
  intensity?: number;
}

export function GridBackground({ className, intensity = 74 }: GridBackgroundProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 bg-[size:34px_34px]", className)}
      style={{
        backgroundImage: `linear-gradient(to right, color-mix(in oklab, var(--border) ${intensity}%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) ${intensity}%, transparent) 1px, transparent 1px)`,
      }}
    />
  );
}
