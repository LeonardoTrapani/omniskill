"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Link2, Plus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const eventConfig = {
  skill_created: {
    icon: Plus,
    color: "bg-emerald-500",
  },
  link_created: {
    icon: Link2,
    color: "bg-blue-500",
  },
  resource_added: {
    icon: FileText,
    color: "bg-amber-500",
  },
} as const;

type ActivityEvent = {
  type: "skill_created" | "link_created" | "resource_added";
  timestamp: Date | string;
  skillId: string;
  skillName: string;
  targetSkillId: string | null;
  targetSkillName: string | null;
  resourcePath: string | null;
};

function EventDescription({ event }: { event: ActivityEvent }) {
  switch (event.type) {
    case "skill_created":
      return (
        <span>
          Created <strong>{event.skillName}</strong>
        </span>
      );
    case "link_created":
      return (
        <span>
          Connected <strong>{event.skillName}</strong> &rarr;{" "}
          <strong>{event.targetSkillName}</strong>
        </span>
      );
    case "resource_added":
      return (
        <span>
          Added {event.resourcePath} to <strong>{event.skillName}</strong>
        </span>
      );
  }
}

export default function ActivityTimeline() {
  const { data, isLoading } = useQuery(trpc.skills.activityFeed.queryOptions());

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Recent Activity
        </p>
        <Card size="sm">
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-5 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const events = data?.events ?? [];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Recent Activity
      </p>

      <Card size="sm">
        {events.length === 0 ? (
          <CardContent className="text-xs text-muted-foreground py-3">
            No activity yet. Create your first skill to get started.
          </CardContent>
        ) : (
          <CardContent className="space-y-1">
            {events.map((event, i) => {
              const config = eventConfig[event.type];
              const Icon = config.icon;

              return (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <div
                    className={cn(
                      "size-5 rounded-full flex items-center justify-center shrink-0",
                      config.color,
                    )}
                  >
                    <Icon className="size-3 text-white" />
                  </div>
                  <span className="text-xs flex-1 min-w-0 truncate">
                    <EventDescription event={event} />
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {relativeTime(new Date(event.timestamp))}
                  </span>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
