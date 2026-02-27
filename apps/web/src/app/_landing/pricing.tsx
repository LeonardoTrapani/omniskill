"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { SectionHeader, SectionBackdrop } from "./grid-background";

const tiers = [
  {
    id: "self-hosted",
    name: "Self-Hosted",
    price: { monthly: 0, yearly: 0 },
    priceUnit: "/forever",
    description: "Free forever for self-hosting. No cost, no card, no hassle.",
    cta: "Get Started",
    highlight: false,
    features: [
      "Unlimited skills",
      "Unlimited users",
      "Full API access",
      "Better Auth integration",
      "Neon Postgres support",
      "Community support",
    ],
  },
  {
    id: "cloud",
    name: "Cloud",
    badge: "Most popular",
    price: { monthly: 10, yearly: 8 },
    priceUnit: "/month",
    description: "Managed infrastructure. Simple, solid, dependable.",
    cta: "Start Free Trial",
    highlight: true,
    features: [
      "Everything in Self-hosted +",
      "Managed database",
      "Automatic backups",
      "99.9% uptime SLA",
      "Priority support",
      "Custom domains",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom" as const,
    priceUnit: "/",
    description: "For large organizations. Dedicated infrastructure.",
    cta: "Talk to Founders",
    highlight: false,
    features: [
      "Everything unlimited",
      "Custom contracts",
      "On-premise option",
      "Dedicated infrastructure",
      "24/7 phone support",
      "Training sessions",
    ],
  },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="relative overflow-hidden">
      <SectionBackdrop />

      <div className="relative z-10 mx-auto max-w-[1112px] px-4 sm:px-6 lg:px-0">
        <SectionHeader
          decorator="Pricing"
          headline={
            <>
              Open source, <span className="text-primary">free</span> to start
            </>
          }
          subtitle="Self-host for free forever, or use our cloud for managed infrastructure."
        />

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-12 flex justify-center"
        >
          <div className="inline-flex border border-border">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2 text-xs font-mono transition-colors ${
                !isYearly
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2 text-xs font-mono transition-colors ${
                isYearly
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly (-20%)
            </button>
          </div>
        </motion.div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-3">
          {tiers.map((tier, i) => {
            const price =
              typeof tier.price === "string"
                ? tier.price
                : isYearly
                  ? tier.price.yearly
                  : tier.price.monthly;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.06 * i }}
                className="relative flex flex-col bg-background p-10"
              >
                <p className="mb-1 text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
                  {tier.name}
                </p>

                {tier.badge && (
                  <span className="absolute top-10 right-10 text-[10px] font-mono uppercase tracking-wider text-primary">
                    {tier.badge}
                  </span>
                )}

                <p className="mt-3 text-xs text-muted-foreground">{tier.description}</p>

                <div className="my-6">
                  {typeof price === "string" ? (
                    <span className="text-4xl font-semibold text-foreground">{price}</span>
                  ) : (
                    <>
                      <span className="text-4xl font-semibold text-foreground">${price}</span>
                      <span className="ml-1 text-sm text-muted-foreground">{tier.priceUnit}</span>
                    </>
                  )}
                </div>

                <Button
                  variant={tier.highlight ? "default" : "outline"}
                  size="lg"
                  className="mb-8 h-10 w-full text-xs"
                >
                  {tier.cta}
                </Button>

                <div className="flex-1 space-y-0">
                  {tier.features.map((feature, fi) => (
                    <div
                      key={fi}
                      className="flex items-start gap-2.5 border-b border-border py-3 text-sm text-muted-foreground last:border-b-0"
                    >
                      <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="h-20" />
      </div>
    </section>
  );
}
