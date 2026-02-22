"use client";

import { motion } from "motion/react";
import Image from "next/image";

const topFeatures = [
  {
    title: "OMNISCIENT CLI",
    description:
      "A command-first interface for building and managing skills directly from your terminal.",
    imageSrc: "/landing/features/feature-image-1.png",
    imageAlt: "Omniscient CLI configuration flow",
    indigoOverlay:
      "bg-[radial-gradient(ellipse_62%_48%_at_86%_12%,rgba(99,102,241,0.32),transparent_52%),radial-gradient(circle_at_8%_78%,rgba(99,102,241,0.2),transparent_36%),radial-gradient(circle_at_46%_96%,rgba(99,102,241,0.12),transparent_34%)]",
  },
  {
    title: "WEB CONSOLE",
    description:
      "Visual skill management, graph exploration, and account settings from your browser.",
    imageSrc: "/landing/features/feature-image-5.png",
    imageAlt: "Omniscient web console skills marketplace",
    indigoOverlay:
      "bg-[radial-gradient(circle_at_12%_18%,rgba(99,102,241,0.28),transparent_42%),radial-gradient(ellipse_70%_55%_at_92%_74%,rgba(99,102,241,0.2),transparent_48%),radial-gradient(circle_at_58%_6%,rgba(99,102,241,0.16),transparent_28%)]",
  },
];

const gridFeatures = [
  {
    id: "skill-graph",
    title: "SKILL INFORMATION",
    description:
      "Explore and understand how your skills connect, what each skill includes, and how everything fits together across your second brain.",
    imageSrc: "/landing/features/feature-image-3.png",
    imageAlt: "Skill information and relationship graph view",
    indigoOverlay:
      "bg-[radial-gradient(ellipse_74%_44%_at_68%_8%,rgba(99,102,241,0.3),transparent_50%),radial-gradient(circle_at_18%_88%,rgba(99,102,241,0.22),transparent_40%),radial-gradient(circle_at_4%_32%,rgba(99,102,241,0.15),transparent_30%)]",
  },
  {
    id: "skill-marketplace",
    title: "SKILL MARKETPLACE",
    description:
      "Browse and install skills from the community. Publish your own skills and earn from usage.",
    imageSrc: "/landing/features/feature-image-2.png",
    imageAlt: "Skill detail page in the marketplace",
    indigoOverlay:
      "bg-[radial-gradient(circle_at_50%_10%,rgba(99,102,241,0.26),transparent_38%),radial-gradient(ellipse_64%_52%_at_88%_90%,rgba(99,102,241,0.2),transparent_50%),radial-gradient(circle_at_22%_46%,rgba(99,102,241,0.14),transparent_34%)]",
  },
  {
    id: "authentication",
    title: "SYNC LOCALLY",
    description:
      "Sync your second-brain skills locally so every agent you use shares the same up-to-date knowledge and capabilities.",
    imageSrc: "/landing/features/feature-image-4.png",
    imageAlt: "CLI sync output after authentication",
    indigoOverlay:
      "bg-[radial-gradient(ellipse_78%_50%_at_20%_14%,rgba(99,102,241,0.3),transparent_54%),radial-gradient(circle_at_84%_82%,rgba(99,102,241,0.24),transparent_40%),radial-gradient(circle_at_62%_44%,rgba(99,102,241,0.13),transparent_30%)]",
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
              <div className="relative aspect-[16/10] bg-secondary border-b border-border overflow-hidden">
                <Image
                  src={feat.imageSrc}
                  alt={feat.imageAlt}
                  fill
                  className="object-cover object-top grayscale contrast-110 brightness-90 transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(min-width: 1024px) 40vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/50" />
                <div
                  className={`absolute inset-0 ${feat.indigoOverlay} mix-blend-screen opacity-[0.48] transition-opacity duration-300 group-hover:opacity-[0.58]`}
                />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {gridFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 * index }}
              className="group bg-background border border-border overflow-hidden hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(99,102,241,0.1)]"
            >
              <div className="relative aspect-[16/10] bg-secondary border-b border-border overflow-hidden">
                <Image
                  src={feature.imageSrc}
                  alt={feature.imageAlt}
                  fill
                  className="object-cover object-top grayscale contrast-110 brightness-90 transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/50" />
                <div
                  className={`absolute inset-0 ${feature.indigoOverlay} mix-blend-screen opacity-[0.48] transition-opacity duration-300 group-hover:opacity-[0.58]`}
                />
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
