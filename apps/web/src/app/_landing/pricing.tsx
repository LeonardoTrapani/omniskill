"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeader, SectionBackdrop } from "./grid-background";
import { LandingContainer, SectionTailSpacer } from "./design-system";

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
      <SectionBackdrop variant="pricing" />

      <LandingContainer>
        <SectionHeader
          decorator="Pricing"
          headline={
            <>
              Open source, <span className="text-primary">free</span> to start
            </>
          }
          subtitle="Self-host for free forever, or use our cloud for managed infrastructure."
        />

        <div className="flex justify-center pb-12">
          <div className="flex border border-border">
            <Button
              onClick={() => setIsYearly(false)}
              size="lg"
              variant="ghost"
              className={`px-5 py-2 text-xs border-none font-mono transition-colors ${
                !isYearly
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </Button>
            <Button
              onClick={() => setIsYearly(true)}
              size="lg"
              variant="ghost"
              className={`px-5 py-2 text-xs border-none font-mono transition-colors ${
                isYearly
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly (-20%)
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-px border border-border bg-border">
          {tiers.map((tier) => {
            const price =
              typeof tier.price === "string"
                ? tier.price
                : isYearly
                  ? tier.price.yearly
                  : tier.price.monthly;

            return (
              <div
                key={tier.id}
                className="relative flex min-w-[280px] flex-1 basis-full flex-col bg-background p-10 md:basis-[calc(33.333%-1px)]"
              >
                {/* ── Header zone: name + badge ── */}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
                    {tier.name}
                  </p>
                  {tier.badge && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
                      {tier.badge}
                    </span>
                  )}
                </div>

                {/* ── Description zone: fixed height ── */}
                <p className="mt-4 min-h-[40px] text-xs leading-relaxed text-muted-foreground">
                  {tier.description}
                </p>

                {/* ── Price zone: fixed height ── */}
                <div className="mt-4 flex h-[52px] items-end gap-1">
                  {typeof price === "string" ? (
                    <span className="text-4xl font-semibold leading-none text-foreground">
                      {price}
                    </span>
                  ) : (
                    <>
                      <span className="text-4xl font-semibold leading-none text-foreground">
                        ${price}
                      </span>
                      <span className="pb-0.5 text-sm text-muted-foreground">{tier.priceUnit}</span>
                    </>
                  )}
                </div>

                {/* ── CTA button ── */}
                <Button
                  variant={tier.highlight ? "default" : "outline"}
                  size="lg"
                  className="mt-6 h-10 w-full text-xs"
                >
                  {tier.cta}
                </Button>

                {/* ── Divider ── */}
                <div className="my-6 h-px w-full bg-border" />

                {/* ── Features list ── */}
                <div className="flex flex-1 flex-col">
                  {tier.features.map((feature, fi) => (
                    <div
                      key={fi}
                      className="flex items-start gap-2.5 border-b border-border py-3 text-sm text-muted-foreground last:border-b-0"
                    >
                      <Check className="size-3 shrink-0 translate-y-0.5 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <SectionTailSpacer />
      </LandingContainer>
    </section>
  );
}
