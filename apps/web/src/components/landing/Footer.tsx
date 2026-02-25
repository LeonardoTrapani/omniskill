"use client";

import Link from "next/link";

const footerLinks = [
  { label: "Skills", href: "/skills", type: "route" },
  { label: "Docs", href: "#docs", type: "anchor" },
  { label: "Pricing", href: "#pricing", type: "anchor" },
  { label: "Github", href: "#github", type: "anchor" },
] as const;

export default function Footer() {
  return (
    <footer className="relative left-1/2 w-screen -translate-x-1/2 border-t border-border bg-background/95 py-16 px-6 backdrop-blur-sm md:px-16">
      <div className="max-w-[1280px] mx-auto">
        <div className="border border-border p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Left side - branding */}
            <div className="flex-1">
              <p className="text-xs text-primary uppercase tracking-[0.05em] mb-3">Omniskill</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                The open agent skills ecosystem. Build, share, and manage a graph of reusable skills
                for your AI agents.
              </p>
            </div>

            {/* Right side - nav links */}
            <div className="flex flex-wrap items-center gap-6">
              {footerLinks.map((link) =>
                link.type === "route" ? (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Omniskill, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
