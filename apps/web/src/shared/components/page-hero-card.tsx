import { cn } from "@/shared/lib/utils";

interface PageHeroCardProps {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}

export default function PageHeroCard({
  eyebrow,
  title,
  description,
  className,
}: PageHeroCardProps) {
  return (
    <header
      className={cn(
        "border border-border bg-background/80 px-8 py-8 backdrop-blur-sm md:px-10",
        className,
      )}
    >
      <p className="text-xs uppercase tracking-[0.08em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground text-balance md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-[720px] text-sm leading-6 text-muted-foreground text-pretty">
        {description}
      </p>
    </header>
  );
}
