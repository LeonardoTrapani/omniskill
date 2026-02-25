"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { X, Menu, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import BrandMark from "@/components/brand-mark";
import UserMenu from "@/components/user-menu";
import { SkillCommandTrigger, SkillCommandPalette } from "@/components/skill-command-palette";
import { trpc } from "@/utils/trpc";

const publicNav = [
  { label: "Skills", href: "/skills" },
  { label: "Docs", href: "#docs" },
  { label: "Pricing", href: "#pricing" },
  { label: "Github", href: "#github" },
];

const appNav = [
  { label: "Vault", href: "/dashboard" },
  { label: "Explore", href: "/skills" },
];

export default function Navbar({ skillCount }: { skillCount?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdInitialSearch, setCmdInitialSearch] = useState("");
  const { data: session, isPending } = authClient.useSession();

  const { data: skillCountData } = useQuery({
    ...trpc.skills.count.queryOptions(),
    enabled: typeof skillCount !== "number",
  });

  const resolvedSkillCount =
    typeof skillCount === "number" ? skillCount : (skillCountData?.count ?? 0);

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

  // global cmd+k listener
  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [session]);

  const openCmd = useCallback(() => setCmdOpen(true), []);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 bg-background border-b border-border transition-all duration-200 ${
          scrolled ? "bg-background/95 backdrop-blur-md" : ""
        }`}
      >
        <div className="relative max-w-5xl mx-auto px-6 md:px-10 flex items-center justify-between h-[52px]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground tracking-tight"
          >
            <BrandMark className="size-3.5" />
            <span>omniskill</span>
          </Link>

          <div className="hidden lg:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href as "/skills"}
                className="text-[13px] text-muted-foreground hover:text-primary transition-colors duration-150"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {mounted &&
              !isPending &&
              (session ? (
                <>
                  <SkillCommandTrigger onOpen={openCmd} />
                  <UserMenu />
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
            {mounted && !isPending && session && <SkillCommandTrigger onOpen={openCmd} />}
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
                  <BrandMark className="size-3.5" />
                  <span>omniskill</span>
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
                {navItems.map((item, i) => (
                  <Link
                    key={item.label}
                    href={item.href as "/skills"}
                    className={`flex items-center justify-between px-4 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors ${
                      i < navItems.length - 1 ? "border-b border-border" : ""
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {mounted &&
                  !isPending &&
                  (session ? (
                    <button
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        setMobileOpen(false);
                        authClient.signOut({
                          fetchOptions: {
                            onSuccess: () => router.push("/"),
                          },
                        });
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="w-full text-center py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign In
                    </Link>
                  ))}
              </div>
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
            if (!next) setCmdInitialSearch("");
          }}
          initialSearch={cmdInitialSearch}
          skillCount={resolvedSkillCount}
        />
      )}
    </>
  );
}
