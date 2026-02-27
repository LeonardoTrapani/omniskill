"use client";

import { motion } from "motion/react";
import { Terminal, Network, Bot, type LucideIcon } from "lucide-react";
import { SectionHeader, SectionBackdrop } from "./grid-background";
import { LandingContainer, SectionTailSpacer } from "./design-system";

const steps: {
  num: string;
  icon: LucideIcon;
  title: string;
  description: string;
  pattern: "cli" | "graph" | "cli-muted";
}[] = [
  {
    num: "01",
    icon: Terminal,
    title: "Start from the CLI",
    description:
      "One command installs Better Skills CLI, authenticates your account, and syncs your local vault so your workflow starts in seconds.",
    pattern: "cli",
  },
  {
    num: "02",
    icon: Network,
    title: "Visualize in Dashboard + Graph",
    description:
      "Open the dashboard to view and manage skills, then jump into the graph to understand connections, structure, and knowledge flow at a glance.",
    pattern: "graph",
  },
  {
    num: "03",
    icon: Bot,
    title: "Use with your favorite agent",
    description:
      "Use your skills with your preferred agent and iterate fast: create, edit, refine, and evolve them directly as your projects grow.",
    pattern: "cli-muted",
  },
];

function StepPattern({ pattern }: { pattern: "cli" | "graph" | "cli-muted" }) {
  if (pattern === "graph") {
    return (
      <svg width="48" height="24" viewBox="0 0 48 24" fill="none" aria-hidden="true">
        <line x1="6" y1="6" x2="22" y2="6" stroke="var(--muted-foreground)" strokeOpacity="0.35" />
        <line x1="22" y1="6" x2="22" y2="18" stroke="var(--muted-foreground)" strokeOpacity="0.35" />
        <line x1="22" y1="18" x2="38" y2="18" stroke="var(--muted-foreground)" strokeOpacity="0.3" />
        <rect x="3" y="3" width="6" height="6" fill="var(--muted-foreground)" fillOpacity="0.45" />
        <rect x="19" y="3" width="6" height="6" fill="var(--muted-foreground)" fillOpacity="0.45" />
        <rect x="19" y="15" width="6" height="6" fill="var(--muted-foreground)" fillOpacity="0.35" />
        <rect x="35" y="15" width="6" height="6" fill="var(--primary)" fillOpacity="0.6" />
      </svg>
    );
  }

  const blocks =
    pattern === "cli"
      ? ["accent", "muted", "muted", "accent", "muted", "muted", "accent"]
      : ["muted", "muted", "muted", "accent-soft", "muted", "muted", "muted"];

  return (
    <svg width="58" height="14" viewBox="0 0 58 14" fill="none" aria-hidden="true">
      {blocks.map((kind, i) => (
        <rect
          key={i}
          x={i * 8 + 1}
          y="4"
          width="6"
          height="6"
          fill={kind.startsWith("accent") ? "var(--primary)" : "var(--muted-foreground)"}
          fillOpacity={kind === "accent" ? 0.75 : kind === "accent-soft" ? 0.45 : 0.3}
        />
      ))}
    </svg>
  );
}

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden">
      <SectionBackdrop variant="how-it-works" />

      <LandingContainer>
        <SectionHeader
          decorator="How It Works"
          headline={
            <>
              Three steps to <span className="text-primary">smarter agents</span>
            </>
          }
          subtitle="From install to publish in minutes. No configuration required."
        />

        <div className="flex flex-wrap gap-px border border-border bg-border">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="flex min-w-[280px] flex-1 basis-full flex-col items-center gap-6 bg-background px-8 py-10 text-center lg:basis-[calc(33.333%-1px)]"
            >
              {/* Decorative pattern */}
              <div className="flex flex-col items-center gap-4">
                <StepPattern pattern={step.pattern} />
              </div>

              {/* Step number + icon */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-semibold text-primary">{step.num}</span>
                <div className="h-px w-4 bg-border" />
                <div className="flex size-8 items-center justify-center border border-border bg-background text-primary">
                  <step.icon className="size-3.5" />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <SectionTailSpacer />
      </LandingContainer>
    </section>
  );
}
