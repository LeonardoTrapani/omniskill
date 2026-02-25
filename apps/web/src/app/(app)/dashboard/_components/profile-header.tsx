"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface ProfileHeaderProps {
  session: typeof authClient.$Infer.Session;
  skillCount: number;
  onAddSkill: () => void;
}

export default function ProfileHeader({ session, skillCount, onAddSkill }: ProfileHeaderProps) {
  const { user } = session;
  const initials = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="border border-border p-6 md:p-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full border border-border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold text-foreground truncate">{user.name}</h1>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-muted-foreground">Member since {memberSince}</span>
            <span className="text-[11px] text-muted-foreground">
              {skillCount} skill{skillCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <Button size="lg" className="px-5 flex-shrink-0" onClick={onAddSkill}>
          <Plus />
          Add New Skill
        </Button>
      </div>
    </div>
  );
}
