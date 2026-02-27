"use client";

import { Brain, TerminalSquare, Globe, Puzzle, Network, RefreshCcw } from "lucide-react";
import { SectionHeader, SectionBackdrop } from "./grid-background";
import { LandingContainer, SectionTailSpacer } from "./design-system";

const features = [
  {
    icon: Brain,
    label: "Second Brain",
    title: "A persistent knowledge graph.",
    titleBold: "",
    description:
      "Every skill, resource, and connection lives in a structured graph your agents can query at runtime. Knowledge that persists across sessions.",
  },
  {
    icon: TerminalSquare,
    label: "CLI",
    title: "Terminal-first ",
    titleBold: "workflow.",
    description:
      "Create, edit, sync, and publish skills directly from your terminal. The CLI is the primary interface for power users and CI pipelines.",
  },
  {
    icon: Globe,
    label: "Web Console",
    title: "Visual skill ",
    titleBold: "management.",
    description:
      "Explore the skill graph, edit resources with a rich markdown editor, manage account settings, and browse the marketplace from any browser.",
  },
  {
    icon: Puzzle,
    label: "Marketplace",
    title: "Discover community ",
    titleBold: "skills.",
    description:
      "Browse and install skills published by others. Share your own skills with the community and extend your agent's capabilities instantly.",
  },
  {
    icon: Network,
    label: "Graph Links",
    title: "Connected skill ",
    titleBold: "topology.",
    description:
      "Skills aren't isolated files. They link to each other through typed edges, mentions, and parent-child relationships that agents can traverse.",
  },
  {
    icon: RefreshCcw,
    label: "Sync",
    title: "Local-remote ",
    titleBold: "synchronization.",
    description:
      "Sync your second brain locally so every agent you use shares the same up-to-date knowledge. Changes propagate bidirectionally between CLI and cloud.",
  },
];

export default function Features() {
  return (
    <section className="relative overflow-hidden">
      <SectionBackdrop variant="features" />

      <LandingContainer>
        <SectionHeader
          decorator="Features"
          headline={
            <>
              Everything your agent
              <br />
              <span className="text-primary">needs</span>
            </>
          }
          subtitle="Fully interactive through an API, MCP, or CLI. Open source and extensible."
        />

        <div className="flex flex-wrap gap-px border border-border bg-border">
          {features.map((feat) => (
            <div
              key={feat.label}
              className="flex min-w-[280px] flex-1 basis-full flex-col gap-6 bg-background p-10 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900 sm:basis-[calc(50%-1px)] lg:basis-[calc(33.333%-1px)]"
            >
              <div className="flex items-center gap-3">
                <feat.icon className="size-4 text-primary" />
                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
                  {feat.label}
                </span>
              </div>

              <h3 className="text-lg text-foreground">
                <span className="font-semibold">{feat.title}</span>
                {feat.titleBold && <span className="font-bold">{feat.titleBold}</span>}
              </h3>

              <p className="text-sm leading-relaxed text-muted-foreground">{feat.description}</p>
            </div>
          ))}
        </div>
        <SectionTailSpacer />
      </LandingContainer>
    </section>
  );
}
