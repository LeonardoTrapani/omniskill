"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface SkillPanelProps {
  icon: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  isEmpty?: boolean;
}

export function SkillPanel({
  icon,
  title,
  trailing,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  isEmpty = false,
}: SkillPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  const headerContent = (
    <>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {title}
        </h2>
        {isEmpty && !open ? (
          <span className="text-[10px] normal-case tracking-normal text-neutral-300">empty</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {trailing}
        {collapsible ? (
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </>
  );

  return (
    <div className={`border border-border bg-background/90 backdrop-blur-sm ${className ?? ""}`}>
      {collapsible ? (
        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-border/70 px-5 py-3.5 transition-colors duration-150 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          {headerContent}
        </div>
      )}

      {!collapsible || open ? children : null}
    </div>
  );
}
