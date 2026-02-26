"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { X, Menu, Settings, Hexagon, Globe } from "lucide-react";

import { authClient } from "@/lib/auth/auth-client";

import UserMenu from "./user-menu";
import { SkillCommandPalette } from "./skill-command-palette";

type PaletteMode = "command" | "vault" | "marketplace";

type NavItem =
  | { label: string; href: Route; kind: "route" }
  | { label: string; href: `#${string}`; kind: "hash" };

const publicNav: NavItem[] = [
  { label: "Skills", href: "/skills", kind: "route" },
  { label: "Docs", href: "#docs", kind: "hash" },
  { label: "Pricing", href: "#pricing", kind: "hash" },
  { label: "Github", href: "#github", kind: "hash" },
];

const appNav: NavItem[] = [
  { label: "My Vault", href: "/vault" as Route, kind: "route" },
  { label: "Explore", href: "/skills", kind: "route" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
              ) : (
                <a
                  key={item.label}
                  href={item.href}
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
                <UserMenu onOpenCommandPalette={openCmd} onSearchVault={openVaultSearch} />
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
            {mounted && !isPending && session && (
              <UserMenu onOpenCommandPalette={openCmd} onSearchVault={openVaultSearch} />
            )}
            <button
              className="text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden">
            <div className="bg-background border-t border-border mx-2 mb-2 p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <span>BETTER-SKILLS</span>
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="border border-border mb-4">
                {navItems.map((item, i) =>
                  item.kind === "route" ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center justify-between px-4 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors ${
                        i < navItems.length - 1 ? "border-b border-border" : ""
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2">
                        {item.label === "My Vault" ? <Hexagon className="size-4" /> : null}
                        {item.label === "Explore" ? <Globe className="size-4" /> : null}
                        {item.label}
                      </span>
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.href}
                      className={`flex items-center justify-between px-4 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors ${
                        i < navItems.length - 1 ? "border-b border-border" : ""
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span>{item.label}</span>
                    </a>
                  ),
                )}
              </div>

              {mounted && !isPending && session && (
                <div className="border border-border mb-4">
                  <Link
                    href="/settings"
                    className="flex items-center justify-between px-4 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Settings className="size-4" />
                      Settings
                    </span>
                  </Link>
                </div>
              )}

              {mounted && !isPending && !session && (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    className="w-full text-center py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

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
