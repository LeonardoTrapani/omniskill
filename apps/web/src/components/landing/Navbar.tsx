"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Menu } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const mainNav = [
  { label: "Skills", href: "/skills" },
  { label: "Docs", href: "#docs" },
  { label: "Pricing", href: "#pricing" },
  { label: "Github", href: "#github" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const ctaLabel = isPending ? "" : session ? "Dashboard" : "Sign In";
  const ctaHref = session ? "/dashboard" : "/login";

  const navContent = (
    <>
      <Link href="/" className="text-sm font-medium text-foreground tracking-tight">
        omniscient
      </Link>

      <div className="hidden lg:flex items-center gap-7">
        {mainNav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="text-[13px] text-muted-foreground hover:text-primary transition-colors duration-150"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-4">
        {!isPending && (
          <Link
            href={ctaHref}
            className="px-3.5 py-1.5 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150"
          >
            {ctaLabel}
          </Link>
        )}
      </div>

      <button
        className="lg:hidden text-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </>
  );

  return (
    <>
      {/* Static nav */}
      <div
        className={`bg-background border-b border-border transition-all duration-200 ${
          scrolled ? "bg-background/95 backdrop-blur-md" : ""
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 md:px-10 flex items-center justify-between h-[52px]">
          {navContent}
        </div>
      </div>

      {/* Mobile Menu - Bottom Sheet */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden">
            <div className="bg-background border-t border-border mx-2 mb-2 p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-foreground">omniscient</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="border border-border mb-4">
                {mainNav.map((item, i) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors ${
                      i < mainNav.length - 1 ? "border-b border-border" : ""
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {!isPending && (
                  <Link
                    href={ctaHref}
                    className="w-full text-center py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {ctaLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
