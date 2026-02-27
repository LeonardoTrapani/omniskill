"use client";

import { motion } from "motion/react";
import { Terminal, Globe, Share2, type LucideIcon } from "lucide-react";
import { SectionHeader, SectionBackdrop } from "./grid-background";

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
      <SectionBackdrop />

      <div className="relative z-10 mx-auto max-w-[1112px] px-4 sm:px-6 lg:px-0">
        <SectionHeader
          decorator="How It Works"
          headline={
            <>
              Three steps to <span className="text-primary">smarter agents</span>
            </>
          }
          subtitle="From install to publish in minutes. No configuration required."
        />

        <div className="space-y-4 pb-20">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.08 * i }}
              className="group relative overflow-hidden border border-border/70 bg-background/85 px-6 py-6 sm:grid sm:grid-cols-[110px_1fr] sm:items-start sm:gap-8 sm:px-8"
            >
              <div className="mb-5 flex shrink-0 items-center gap-4 sm:mb-0 sm:flex-col sm:items-start sm:gap-3">
                <span className="font-mono text-3xl font-semibold text-primary">{step.num}</span>
                <div className="flex size-9 items-center justify-center border border-border bg-background/90 text-primary">
                  <step.icon className="size-4" />
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  Step {step.num}
                </p>
                <h3 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
