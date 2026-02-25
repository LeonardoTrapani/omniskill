"use client";

import { useState, useEffect } from "react";
import SkillsTable from "@/components/landing/SkillsTable";
import Navbar from "@/components/navbar";
import Footer from "@/components/landing/Footer";
import { brainAscii } from "@/lib/constants";

export default function SkillsPage() {
  const [visibleLines, setVisibleLines] = useState(0);
  const brainLines = brainAscii.split("\n");

  // Animate brain ASCII line by line
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev < brainLines.length) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 30); // 30ms per line

    return () => clearInterval(interval);
  }, [brainLines.length]);

  return (
    <main className="relative min-h-screen bg-background">
      {/* Brain ASCII Background */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
        <pre className="text-[4px] sm:text-[5px] md:text-[6px] lg:text-[7px] leading-[1.15] text-primary/[0.07] whitespace-pre">
          {brainLines.slice(0, visibleLines).join("\n")}
        </pre>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar />

        {/* Header */}
        <div className="pt-12 pb-0 px-6 md:px-16">
          <div className="max-w-[1280px] mx-auto">
            <div className="border border-primary/20 bg-background/40 backdrop-blur-sm p-8 md:p-12">
              <p className="text-xs text-primary uppercase tracking-[0.08em] mb-3">
                Skills Marketplace
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-4">
                Explore the ecosystem
              </h1>
              <p className="text-base text-muted-foreground max-w-[640px] leading-relaxed">
                Browse the complete catalog of skills in the Omniscient ecosystem. Install skills to
                your agent graph with one click, or publish your own for the community.
              </p>
            </div>
          </div>
        </div>

        <SkillsTable showViewAll={false} infiniteScroll className="pt-8 pb-24 px-6 md:px-16" />

        <Footer />
      </div>
    </main>
  );
}
