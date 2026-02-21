"use client";

import { motion } from "motion/react";

const topFeatures = [
  {
    title: "OMNISCIENT CLI",
    description:
      "A command-first interface for building and managing skills directly from your terminal.",
  },
  {
    title: "WEB CONSOLE",
    description:
      "Visual skill management, graph exploration, and account settings from your browser.",
  },
];

const gridFeatures = [
  {
    id: "skill-graph",
    title: "SKILL GRAPH",
    description:
      "Build reusable skills organized as a graph. Connect skills together to create powerful agent workflows.",
  },
  {
    id: "skill-marketplace",
    title: "SKILL MARKETPLACE",
    description:
      "Browse and install skills from the community. Publish your own skills and earn from usage.",
  },
  {
    id: "authentication",
    title: "AUTHENTICATION",
    description:
      "Secure your skills with Better Auth. User management, sessions, and OAuth out of the box.",
  },
  {
    id: "database",
    title: "DATABASE",
    description:
      "Powered by Neon Serverless Postgres. Automatic migrations, branching, and instant scaling.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 md:px-16">
      <div className="max-w-[1280px] mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="border border-border p-8 mb-8"
        >
          <p className="text-xs text-primary uppercase tracking-[0.05em] mb-4">Features</p>
          <p className="text-base text-muted-foreground leading-relaxed">
            Everything your agent needs, fully interactive through an API or MCP.
          </p>
        </motion.div>

        {/* Top 2 Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {topFeatures.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
              className="group bg-background border border-border overflow-hidden hover:border-primary/40 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="aspect-[16/10] bg-secondary border-b border-border flex items-center justify-center">
                <div className="text-muted-foreground text-sm">Preview</div>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.05em] text-foreground mb-3">
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {gridFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 * index }}
              className="group bg-background border border-border overflow-hidden hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(99,102,241,0.1)]"
            >
              <div className="aspect-[16/10] bg-secondary border-b border-border overflow-hidden flex items-center justify-center">
                <div className="text-muted-foreground text-xs">Preview</div>
              </div>
              <div className="p-6">
                <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
