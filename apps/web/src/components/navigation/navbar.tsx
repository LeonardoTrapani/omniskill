"use client";

import { useState, useEffect, useCallback, type MouseEvent } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Command, Search, Hexagon, Globe } from "lucide-react";

import { authClient } from "@/lib/auth/auth-client";

import UserMenu from "./user-menu";
import { SkillCommandPalette } from "./skill-command-palette";

type PaletteMode = "command" | "vault";

type NavItem =
  | { label: string; href: Route; kind: "route" }
  | { label: string; href: `#${string}`; kind: "hash" }
  | { label: string; href: `https://${string}`; kind: "external" };

const publicNav: NavItem[] = [
  { label: "Features", href: "#features", kind: "hash" },
  { label: "Pricing", href: "#pricing", kind: "hash" },
  {
    label: "Docs",
    href: "https://github.com/better-skills/better-skills#readme",
    kind: "external",
  },
  { label: "GitHub", href: "https://github.com/better-skills", kind: "external" },
];

const appNav: NavItem[] = [];

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, _setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdInitialSearch, setCmdInitialSearch] = useState("");
  const [cmdInitialMode, setCmdInitialMode] = useState<PaletteMode>("command");
  const { data: session, isPending } = authClient.useSession();
  const brandHref = (mounted && session ? "/vault" : "/") as Route;

  const navItems = mounted && session ? appNav : publicNav;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // read ?q= param to auto-open palette
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (!q) return;
    setCmdInitialSearch(q);
    setCmdOpen(true);
    params.delete("q");
    const cleaned = params.toString() ? `${pathname}?${params}` : pathname;
    window.history.replaceState(null, "", cleaned);
  }, [pathname, session]);

  // global Cmd+K listener (command mode) and Cmd+/ listener (vault mode)
  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdInitialMode("command");
        setCmdInitialSearch("");
        setCmdOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setCmdInitialMode("vault");
        setCmdInitialSearch("");
        setCmdOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [session]);

  const openCmd = useCallback(() => {
    setCmdInitialMode("command");
    setCmdInitialSearch("");
    setCmdOpen(true);
  }, []);

  const openVaultSearch = useCallback(() => {
    setCmdInitialMode("vault");
    setCmdInitialSearch("");
    setCmdOpen(true);
  }, []);

  const handleHashNavClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: `#${string}`) => {
      if (pathname !== "/") return;

      const section = document.querySelector<HTMLElement>(href);
      if (!section) return;

      event.preventDefault();

      const navOffset = 60;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY - navOffset;

      window.scrollTo({
        top: Math.max(0, sectionTop),
        behavior: "smooth",
      });

      window.history.replaceState(null, "", href);
    },
    [pathname],
  );

  return (
    <>
      <nav
        className={`sticky top-0 z-50 bg-background border-b border-border transition-all duration-200 ${
          scrolled ? "bg-background/95" : ""
        }`}
      >
        <div className="relative mx-auto px-5 flex items-center justify-between h-[52px]">
          <Link
            href={brandHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground tracking-tight"
          >
            <span>BETTER-SKILLS.</span>
          </Link>

          <div className="hidden lg:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) =>
              item.kind === "route" ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-primary transition-colors duration-150"
                >
                  {item.label === "My Vault" ? <Hexagon className="size-3.5" /> : null}
                  {item.label === "Explore" ? <Globe className="size-3.5" /> : null}
                  {item.label}
                </Link>
              ) : item.kind === "hash" ? (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(event) => handleHashNavClick(event, item.href)}
                  className="text-[13px] text-muted-foreground hover:text-primary transition-colors duration-150"
                >
                  {item.label}
                </a>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] text-muted-foreground hover:text-primary transition-colors duration-150"
                >
                  {item.label}
                </a>
              ),
            )}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {mounted &&
              !isPending &&
              (session ? (
                <>
                  <button
                    type="button"
                    onClick={openCmd}
                    className="inline-flex h-8 items-center gap-6 border border-border bg-background pl-2 pr-1.5 text-muted-foreground transition-colors hover:bg-muted-foreground/3"
                    aria-label="Open search and command menu with Command+K"
                  >
                    <div className="inline-flex gap-2 items-center">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">Search</span>
                    </div>
                    <span className="inline-flex items-center gap-0.5 rounded-xs border border-border px-1.5 py-0.5 text-[10px] font-mono tracking-widest text-foreground">
                      <Command className="h-2 w-2" />K
                    </span>
                  </button>
                  <UserMenu onOpenCommandPalette={openCmd} onSearchVault={openVaultSearch} />
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150"
                >
                  Sign In
                </Link>
              ))}
          </div>

          <div className="flex lg:hidden items-center gap-3">
            {mounted &&
              !isPending &&
              (session ? (
                <UserMenu onOpenCommandPalette={openCmd} onSearchVault={openVaultSearch} />
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150"
                >
                  Sign In
                </Link>
              ))}
          </div>
        </div>
      </nav>
      {/* single palette instance */}
      {mounted && !isPending && session && (
        <SkillCommandPalette
          open={cmdOpen}
          onOpenChange={(next) => {
            setCmdOpen(next);
            if (!next) {
              setCmdInitialSearch("");
              setCmdInitialMode("command");
            }
          }}
          initialSearch={cmdInitialSearch}
          initialMode={cmdInitialMode}
        />
      )}
    </>
  );
}
