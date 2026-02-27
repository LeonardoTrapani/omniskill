"use client";

import { motion } from "motion/react";
import { Terminal, Globe, Share2, type LucideIcon } from "lucide-react";
import { SectionHeader, SectionBackdrop } from "./grid-background";
import { LandingContainer, SectionTailSpacer } from "./design-system";

const steps: { num: string; icon: LucideIcon; title: string; description: string }[] = [
  {
    num: "01",
    icon: Terminal,
    title: "Install the CLI",
    description:
      "One command installs the CLI, authenticates with your account, and syncs your skills locally so every agent shares the same knowledge base.",
  },
  {
    num: "02",
    icon: Globe,
    title: "Curate from the web",
    description:
      "Browse, edit, and organize your skills from the web console. Explore the skill graph, manage resources, and keep your second brain up to date.",
  },
  {
    num: "03",
    icon: Share2,
    title: "Publish & discover",
    description:
      "Share skills with the community through the marketplace. Install skills built by others to extend your agent's capabilities instantly.",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden">
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

        <div className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.08 * i }}
              className="group relative flex flex-col gap-5 overflow-hidden border border-border/70 bg-background/85 px-6 py-6 sm:flex-row sm:items-start sm:gap-8 sm:px-8"
            >
              <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-start sm:gap-3">
                <span className="font-mono text-3xl font-semibold text-primary">{step.num}</span>
                <div className="flex size-9 items-center justify-center border border-border bg-background/90 text-primary">
                  <step.icon className="size-4" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  Step {step.num}
                </p>
                <h3 className="text-xl font-semibold tracking-tight text-foreground">{step.title}</h3>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        <SectionTailSpacer />
      </LandingContainer>
    </section>
  );
}
