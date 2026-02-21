"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 px-6 md:px-16">
      <div className="max-w-[1280px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative border border-primary/30 overflow-hidden"
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 p-12 md:p-16">
            {/* Left column */}
            <div className="text-left">
              <p className="text-xs text-primary uppercase tracking-[0.08em] mb-4">
                Ready to get started?
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-6 tracking-tight leading-[1.2]">
                Build your agent's second brain
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                Join developers building the future of AI agents. Start with our free tier and scale
                as you grow.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#get-started"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all duration-150 group"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a
                  href="#docs"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground text-sm hover:border-primary/40 hover:text-primary transition-colors duration-150"
                >
                  View documentation
                </a>
              </div>
            </div>

            {/* Right column - stats */}
            <div className="grid grid-cols-2 gap-8">
              <div className="border border-border p-6">
                <div className="text-3xl font-semibold text-primary mb-2">50+</div>
                <p className="text-sm text-muted-foreground">Pre-built skills ready to use</p>
              </div>
              <div className="border border-border p-6">
                <div className="text-3xl font-semibold text-primary mb-2">
                  <span className="text-[28px]">&lt;</span>50ms
                </div>
                <p className="text-sm text-muted-foreground">Average skill load time</p>
              </div>
              <div className="border border-border p-6">
                <div className="text-3xl font-semibold text-primary mb-2">100%</div>
                <p className="text-sm text-muted-foreground">Type-safe TypeScript</p>
              </div>
              <div className="border border-border p-6">
                <div className="text-3xl font-semibold text-primary mb-2">Free</div>
                <p className="text-sm text-muted-foreground">Open source, forever</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
