"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { LandingContainer } from "./design-system";
import { SectionBackdrop } from "./grid-background";

export default function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <SectionBackdrop variant="default" />

      {/* Extra CTA-specific decorative layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Desktop decorations */}
        <div className="absolute top-0 bottom-0 left-1/2 hidden w-full max-w-[1112px] -translate-x-1/2 lg:block">
          {/* Cross-hatch horizontal rules at multiple heights */}
          <div className="absolute top-12 left-0 h-px w-[100px] bg-border/40" />
          <div className="absolute top-12 right-0 h-px w-[100px] bg-border/40" />
          <div className="absolute top-1/2 left-0 h-px w-[60px] bg-border/30" />
          <div className="absolute top-1/2 right-0 h-px w-[60px] bg-border/30" />
          <div className="absolute bottom-12 left-0 h-px w-[100px] bg-border/40" />
          <div className="absolute bottom-12 right-0 h-px w-[100px] bg-border/40" />

          {/* Small primary accent squares at rule endpoints */}
          <div className="absolute left-[100px] top-12 size-1.5 -translate-y-1/2 bg-primary/35" />
          <div className="absolute right-[100px] top-12 size-1.5 -translate-y-1/2 bg-primary/35" />
          <div className="absolute left-[100px] bottom-12 size-1.5 translate-y-1/2 bg-primary/30" />
          <div className="absolute right-[100px] bottom-12 size-1.5 translate-y-1/2 bg-primary/30" />

          {/* Vertical connector accents */}
          <div className="absolute left-[50px] top-12 h-[40px] w-px bg-border/25" />
          <div className="absolute right-[50px] top-12 h-[40px] w-px bg-border/25" />
          <div className="absolute left-[50px] bottom-12 h-[40px] w-px bg-border/25" />
          <div className="absolute right-[50px] bottom-12 h-[40px] w-px bg-border/25" />
        </div>

        {/* Mobile extra decorations */}
        <div className="lg:hidden">
          <div className="absolute top-8 left-4 h-px w-[50px] bg-border/35" />
          <div className="absolute top-8 right-4 h-px w-[50px] bg-border/35" />
          <div className="absolute bottom-8 left-4 h-px w-[50px] bg-border/35" />
          <div className="absolute bottom-8 right-4 h-px w-[50px] bg-border/35" />
          <div className="absolute left-[54px] top-8 size-1 -translate-y-1/2 bg-primary/30" />
          <div className="absolute right-[54px] top-8 size-1 -translate-y-1/2 bg-primary/30" />
        </div>
      </div>

      <LandingContainer className="py-28 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="relative flex w-full flex-col items-center gap-4 border border-border/70 bg-background/85 px-8 py-14 text-center sm:px-12"
        >
          {/* Inner card corner accents */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-4 left-4 h-px w-6 bg-border/50" />
            <div className="absolute top-4 left-4 h-6 w-px bg-border/50" />
            <div className="absolute top-4 right-4 h-px w-6 bg-border/50" />
            <div className="absolute top-4 right-4 h-6 w-px bg-border/50" />
            <div className="absolute bottom-4 left-4 h-px w-6 bg-border/50" />
            <div className="absolute bottom-4 left-4 h-6 w-px bg-border/50" />
            <div className="absolute bottom-4 right-4 h-px w-6 bg-border/50" />
            <div className="absolute bottom-4 right-4 h-6 w-px bg-border/50" />
          </div>

          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-primary">
            // Get Started \\
          </p>

          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ready to build?
          </h2>

          <p className="max-w-md pb-6 text-sm leading-relaxed text-muted-foreground">
            Start building your agent&rsquo;s second brain for free and scale seamlessly as your
            project expands. No credit card needed.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-11 gap-2 px-7 text-sm"
              render={<Link href="/login?next=/vault" />}
            >
              Start for Free
              <ArrowRight className="size-3.5" data-icon="inline-end" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-7 text-sm"
              render={<Link href="#pricing" />}
            >
              See our plans
            </Button>
          </div>
        </motion.div>
      </LandingContainer>
    </section>
  );
}
