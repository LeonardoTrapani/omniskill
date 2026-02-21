"use client";
import Link from "next/link";

import { Plus } from "lucide-react";

import { Button } from "./ui/button";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-5xl mx-auto px-6 md:px-10 h-[52px] flex items-center justify-between">
        <Link href="/dashboard" className="text-sm font-medium text-foreground tracking-tight">
          omniscient
        </Link>
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard">
            <Button size="sm" className="px-3.5">
              <Plus />
              Add Skill
            </Button>
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
