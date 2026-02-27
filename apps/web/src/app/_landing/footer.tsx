"use client";

import Link from "next/link";
import type { Route } from "next";
import { Separator } from "@/components/ui/separator";

const columns: { title: string; links: { label: string; href: string; external: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Skills", href: "/skills", external: false },
      { label: "Pricing", href: "#pricing", external: false },
      { label: "CLI", href: "#docs", external: false },
      { label: "Changelog", href: "#", external: false },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#docs", external: false },
      { label: "API Reference", href: "#", external: false },
      { label: "GitHub", href: "https://github.com/better-skills", external: true },
      { label: "Community", href: "#", external: false },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#", external: false },
      { label: "Blog", href: "#", external: false },
      { label: "Contact", href: "#", external: false },
      { label: "Open Source", href: "#", external: false },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background px-4 py-16 sm:px-6 lg:px-0">
      <div className="flex w-full justify-center">
        <div className="flex w-full max-w-[1112px] flex-col gap-10">
          <div className="flex flex-wrap gap-10">
            <div className="flex min-w-[220px] flex-1 basis-full flex-col gap-3 md:basis-[calc(25%-30px)]">
              <p className="text-sm font-medium text-foreground">BETTER-SKILLS.</p>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                The open agent skills ecosystem. Build, share, and manage a graph of reusable skills
                for your AI agents.
              </p>
            </div>

            {columns.map((col) => (
              <div
                key={col.title}
                className="flex min-w-[160px] flex-1 basis-[calc(50%-20px)] flex-col gap-4 md:basis-[calc(25%-30px)]"
              >
                <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
                  {col.title}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground transition-colors hover:text-primary"
                        >
                          {link.label}
                        </a>
                      ) : link.href.startsWith("#") ? (
                        <a
                          href={link.href}
                          className="text-xs text-muted-foreground transition-colors hover:text-primary"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href as Route}
                          className="text-xs text-muted-foreground transition-colors hover:text-primary"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="py-2">
            <Separator />
          </div>

          <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
            <p>&copy; {new Date().getFullYear()} BETTER-SKILLS, Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="transition-colors hover:text-primary">
                Privacy
              </a>
              <a href="#" className="transition-colors hover:text-primary">
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
