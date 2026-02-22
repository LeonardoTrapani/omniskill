"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe, Layers, Link2, Lock, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

function HeatmapGrid({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  const today = new Date();
  const cells: { date: string; count: number }[] = [];

  for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(today);
      d.setDate(d.getDate() - weekOffset * 7 - (6 - day));
      const dateStr = d.toISOString().split("T")[0]!;
      const match = data.find((h) => h.date === dateStr);
      cells.push({ date: dateStr, count: match?.count ?? 0 });
    }
  }

  function intensity(count: number): string {
    if (count === 0) return "bg-muted";
    const ratio = count / maxCount;
    if (ratio <= 0.25) return "bg-chart-1/40";
    if (ratio <= 0.5) return "bg-chart-2/60";
    if (ratio <= 0.75) return "bg-chart-3/80";
    return "bg-chart-4";
  }

  return (
    <div className="grid grid-cols-12 grid-rows-7 gap-[2px]">
      {cells.map((cell, i) => (
        <div
          key={i}
          className={cn("size-[6px] rounded-[1px]", intensity(cell.count))}
          title={`${cell.date}: ${cell.count}`}
        />
      ))}
    </div>
  );
}

export default function StatsCards() {
  const { data, isLoading } = useQuery(trpc.skills.stats.queryOptions());

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card size="sm" key={i} className="!py-2">
            <CardContent className="flex items-center gap-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
      <Card size="sm" className="!py-2 !gap-0">
        <CardContent className="flex items-center gap-2">
          <Layers className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-lg font-bold tabular-nums leading-none">{data.totalSkills}</span>
          <span className="text-[10px] text-muted-foreground">skills</span>
        </CardContent>
      </Card>

      <Card size="sm" className="!py-2 !gap-0">
        <CardContent className="flex items-center gap-2">
          <TrendingUp className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-lg font-bold tabular-nums leading-none">{data.skillsThisWeek}</span>
          <span className="text-[10px] text-muted-foreground">this week</span>
          {data.skillsThisWeek > 0 && (
            <span className="text-[10px] text-emerald-500 font-medium">+{data.skillsThisWeek}</span>
          )}
        </CardContent>
      </Card>

      <Card size="sm" className="!py-2 !gap-0">
        <CardContent className="flex items-center gap-2">
          <Globe className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-lg font-bold tabular-nums leading-none">{data.publicCount}</span>
          <span className="text-[10px] text-muted-foreground">/</span>
          <Lock className="size-3 text-muted-foreground shrink-0" />
          <span className="text-lg font-bold tabular-nums leading-none text-muted-foreground">
            {data.privateCount}
          </span>
        </CardContent>
      </Card>

      <Card size="sm" className="!py-2 !gap-0">
        <CardContent className="flex items-center gap-2">
          <Link2 className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-lg font-bold tabular-nums leading-none">
            {data.totalConnections}
          </span>
          <span className="text-[10px] text-muted-foreground">links</span>
        </CardContent>
      </Card>

      <Card size="sm" className="!py-2 !gap-0 col-span-2 md:col-span-1">
        <CardContent className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground shrink-0">Activity</span>
          <HeatmapGrid data={data.activityHeatmap} />
        </CardContent>
      </Card>
    </div>
  );
}
