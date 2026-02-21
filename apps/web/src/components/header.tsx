"use client";
import Link from "next/link";

import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-5xl mx-auto px-6 md:px-10 h-[52px] flex items-center justify-between">
        <Link href="/dashboard" className="text-sm font-medium text-foreground tracking-tight">
          omniscient
        </Link>
        <div className="flex items-center gap-2.5">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
