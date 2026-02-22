"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="px-6 py-20 md:px-10 lg:py-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Ready to Get Started?
        </p>

        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance sm:text-4xl">
          Build Your Agent&rsquo;s Second Brain
        </h2>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
          Open-source, free to start. Manage reusable skills from CLI&nbsp;&amp;&nbsp;web in
          minutes.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login?next=/dashboard"
            className="group inline-flex h-11 w-full items-center justify-center gap-2 bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 sm:w-auto"
          >
            Start for Free
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <a
            href="#docs"
            className="inline-flex h-11 w-full items-center justify-center border border-border px-6 text-sm text-foreground transition-colors duration-150 hover:border-primary/40 hover:text-primary sm:w-auto"
          >
            View Documentation
          </a>
        </div>
      </motion.div>
    </section>
  );
}
