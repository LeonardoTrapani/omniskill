"use client";

import Link from "next/link";
import type { Route } from "next";

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
    <footer className="border-t border-border bg-background">
      <div className="flex w-full justify-center px-6 sm:px-8 lg:px-0">
        <div className="flex w-full max-w-[1112px] flex-col lg:px-16">
          {/* Main footer content */}
          <div className="flex flex-col gap-10 py-16 sm:py-20">
            <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
              {/* Brand column */}
              <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
                <p className="text-sm font-medium tracking-tight text-foreground">BETTER-SKILLS.</p>
                <p className="max-w-[200px] text-xs leading-relaxed text-muted-foreground">
                  The open agent skills ecosystem. Build, share, and manage reusable skills for your
                  AI agents.
                </p>
              </div>

              {/* Link columns */}
              {columns.map((col) => (
                <div key={col.title} className="flex flex-col gap-4">
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
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row">
            <p>&copy; {new Date().getFullYear()} BETTER-SKILLS, Inc.</p>
            <div className="flex items-center gap-6">
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
