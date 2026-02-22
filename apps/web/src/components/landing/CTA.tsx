"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="px-4 py-16 sm:px-6 md:px-10 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative border border-primary/30 overflow-hidden"
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

          <div className="relative grid grid-cols-1 gap-8 p-5 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-12">
            {/* Left column */}
            <div className="min-w-0 text-left">
              <p className="text-xs text-primary uppercase tracking-[0.08em] mb-4">
                Ready to get started?
              </p>
              <h2 className="mb-6 text-3xl font-semibold leading-[1.2] tracking-tight text-foreground text-balance sm:text-4xl">
                Build your agent's second brain
              </h2>
              <p className="mb-8 max-w-xl text-base leading-relaxed text-muted-foreground">
                Join developers building the future of AI agents. Start with our free tier and scale
                as you grow.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#get-started"
                  className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 group sm:w-auto"
                >
                  Start for free
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </a>
                <a
                  href="#docs"
                  className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 border border-border text-foreground text-sm hover:border-primary/40 hover:text-primary transition-colors duration-150 sm:w-auto"
                >
                  View documentation
                </a>
              </div>
            </div>

            {/* Right column - stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="min-w-0 border border-border p-5 sm:p-6">
                <div className="mb-2 text-2xl font-semibold text-primary sm:text-3xl">50+</div>
                <p className="text-sm leading-7 text-muted-foreground break-words">
                  Pre-built skills ready to use
                </p>
              </div>
              <div className="min-w-0 border border-border p-5 sm:p-6">
                <div className="mb-2 text-2xl font-semibold text-primary sm:text-3xl">
                  <span className="text-[24px] sm:text-[28px]">&lt;</span>50ms
                </div>
                <p className="text-sm leading-7 text-muted-foreground break-words">
                  Average skill load time
                </p>
              </div>
              <div className="min-w-0 border border-border p-5 sm:p-6">
                <div className="mb-2 text-2xl font-semibold text-primary sm:text-3xl">100%</div>
                <p className="text-sm leading-7 text-muted-foreground break-words">
                  Type-safe TypeScript
                </p>
              </div>
              <div className="min-w-0 border border-border p-5 sm:p-6">
                <div className="mb-2 text-2xl font-semibold text-primary sm:text-3xl">Free</div>
                <p className="text-sm leading-7 text-muted-foreground break-words">
                  Open source, forever
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
