"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";

const tiers = [
  {
    id: "self-hosted",
    name: "SELF-HOSTED",
    price: { monthly: 0, yearly: 0 },
    priceUnit: "/forever",
    description: "Free forever for self-hosting",
    cta: "Get Started",
    features: [
      "Unlimited skills",
      "Unlimited users",
      "Full API access",
      "Better Auth integration",
      "Neon Postgres support",
      "Hono API backend",
      "Community support",
    ],
  },
  {
    id: "cloud",
    name: "CLOUD",
    badge: "Popular",
    price: { monthly: 10, yearly: 8 },
    priceUnit: "/month",
    description: "Managed infrastructure",
    cta: "Start free trial",
    features: [
      "Everything in Self-hosted +",
      "Managed database",
      "Automatic backups",
      "99.9% uptime SLA",
      "Priority support",
      "Custom domains",
      "Analytics dashboard",
    ],
  },
  {
    id: "enterprise",
    name: "ENTERPRISE",
    price: "Custom" as const,
    priceUnit: "/",
    description: "For large organizations",
    cta: "Talk to Founders",
    features: [
      "Everything unlimited",
      "Custom contracts",
      "On-premise option",
      "Dedicated infrastructure",
      "24/7 phone support",
      "Custom SLA",
      "Training sessions",
    ],
  },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-primary mb-4">
          PRICING
        </h2>
        <p className="text-base text-muted-foreground max-w-[700px] mx-auto leading-relaxed">
          Open source and free to self-host, or use our cloud for managed infrastructure.
        </p>
      </motion.div>

      {/* Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="flex justify-center mb-12"
      >
        <div className="flex items-center gap-0 text-sm">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-4 py-2 transition-colors duration-150 ${
              !isYearly
                ? "text-primary underline underline-offset-4 decoration-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-4 py-2 transition-colors duration-150 ${
              isYearly
                ? "text-primary underline underline-offset-4 decoration-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly (Save 20%)
          </button>
        </div>
      </motion.div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {tiers.map((tier, index) => {
          const price =
            typeof tier.price === "string"
              ? tier.price
              : isYearly
                ? tier.price.yearly
                : tier.price.monthly;

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 * index }}
              className={`relative flex flex-col bg-background border p-8 ${
                tier.badge ? "border-primary" : "border-border"
              }`}
            >
              {tier.badge && (
                <span className="absolute -top-3 right-8 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                  {tier.badge}
                </span>
              )}

              <h3 className="text-sm font-semibold uppercase tracking-[0.05em] text-foreground mb-6">
                {tier.name}
              </h3>

              <div className="mb-2">
                {typeof price === "string" ? (
                  <span className="text-4xl font-semibold text-foreground">{price}</span>
                ) : (
                  <span className="text-4xl font-semibold text-foreground">${price}</span>
                )}
                {tier.priceUnit && typeof price !== "string" && (
                  <span className="text-sm text-muted-foreground">{tier.priceUnit}</span>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>

              <a
                href="#"
                className={`w-full text-center py-3 text-sm font-medium transition-all duration-150 hover:scale-[1.02] mb-8 block ${
                  tier.badge
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border text-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {tier.cta}
              </a>

              <div className="flex-1">
                {tier.features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 py-2.5 text-sm text-muted-foreground border-b border-border last:border-b-0"
                  >
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
