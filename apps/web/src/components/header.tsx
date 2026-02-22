"use client";
import Link from "next/link";

import { Plus } from "lucide-react";

import { Button } from "./ui/button";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 h-[52px] flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm font-medium text-foreground tracking-tight">
          omniscient
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button size="sm" className="px-2.5 sm:px-3.5" aria-label="Add Skill">
              <Plus />
              <span className="hidden sm:inline">Add Skill</span>
            </Button>
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
