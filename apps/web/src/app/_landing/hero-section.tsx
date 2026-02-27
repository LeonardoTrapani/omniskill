"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Copy, Check, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { authClient } from "@/lib/auth/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeroGridOverlay } from "./grid-background";

export default function HeroSection({ skillCount }: { skillCount: number }) {
  const [didCopy, setDidCopy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session } = authClient.useSession();

  const ctaHref = (mounted && session ? "/vault" : "/login") as Route;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("curl -fsSL https://better-skills.dev/install | bash");
      setDidCopy(true);
      setTimeout(() => setDidCopy(false), 1500);
    } catch {
      setDidCopy(false);
    }
  };

  return (
    <section className="relative flex min-h-[calc(100vh-52px)] flex-col items-center justify-center overflow-hidden lg:min-h-[calc(90vh-52px)]">
      <HeroGridOverlay />

      <div className="relative z-10 flex w-full justify-center px-4">
        <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Badge
              variant="outline"
              className="gap-2 border-primary/30 bg-background/80 px-3.5 py-1.5 text-xs font-normal text-muted-foreground backdrop-blur-sm"
            >
              <span className="inline-block size-1.5 bg-primary" />
              {skillCount > 0 ? `${skillCount} skills in the registry` : "Open source & free"}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl"
          >
            Your Agent&rsquo;s
            <br />
            <span className="text-primary">Second Brain</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="max-w-md text-base leading-relaxed text-muted-foreground sm:px-0 px-6"
          >
            Build, share, and manage a graph of reusable skills for your AI agents. It&rsquo;s also
            open source.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center sm:px-0 px-6"
          >
            <Button
              size="lg"
              className="h-11 w-full gap-2 px-7 text-sm sm:w-auto"
              render={<Link href={ctaHref} />}
            >
              {mounted && session ? "Go to Vault" : "Get Started"}
              <ArrowRight className="size-3.5" data-icon="inline-end" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleCopy}
              className="group h-11 w-full justify-between gap-3 border-border bg-background/80 px-4 font-mono text-xs font-normal text-muted-foreground backdrop-blur-sm hover:border-primary/40 hover:text-foreground sm:w-auto"
            >
              <span className="flex min-w-0 items-center gap-2 text-left">
                <span className="shrink-0 text-primary/60">$</span>
                <span className="truncate">curl -fsSL https://better-skills.dev/install | bash</span>
              </span>
              <span className="inline-flex size-6 shrink-0 items-center justify-center border border-border/70 bg-background">
                {didCopy ? (
                  <Check className="size-3 text-primary" />
                ) : (
                  <Copy className="size-3 opacity-70 transition-opacity group-hover:opacity-100" />
                )}
              </span>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
