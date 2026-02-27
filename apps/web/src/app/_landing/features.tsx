"use client";

import { motion } from "motion/react";
import { Brain, TerminalSquare, Globe, Puzzle, Network, RefreshCcw } from "lucide-react";
import { SectionHeader, SectionBackdrop } from "./grid-background";

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
      <SectionBackdrop />

      <div className="relative z-10 mx-auto max-w-[1112px] px-4 sm:px-6 lg:px-0">
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

        {/* 2x3 feature grid (Firecrawl / Better Auth style) */}
        <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feat, i) => (
            <motion.div
              key={feat.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.04 * i }}
              className="flex flex-col bg-background p-10 transition-colors hover:bg-neutral-50"
            >
              <div className="mb-6 flex items-center gap-3">
                <feat.icon className="size-4 text-primary" />
                <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
                  {feat.label}
                </span>
              </div>

              <h3 className="mb-3 text-lg text-foreground">
                <span className="font-semibold">{feat.title}</span>
                {feat.titleBold && <span className="font-bold">{feat.titleBold}</span>}
              </h3>

              <p className="text-sm leading-relaxed text-muted-foreground">{feat.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="h-20" />
      </div>
    </section>
  );
}
