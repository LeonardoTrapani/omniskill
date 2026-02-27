"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { LandingContainer } from "./design-system";

export default function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <LandingContainer className="py-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="flex w-full flex-col items-center gap-4 border border-border/70 bg-background/85 px-8 py-14 text-center sm:px-12"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-primary">
            // Get Started \\
          </p>

          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Ready to build?</h2>

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
