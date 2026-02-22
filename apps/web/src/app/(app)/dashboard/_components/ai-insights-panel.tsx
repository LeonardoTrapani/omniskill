"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Link2, Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

const typeConfig = {
  connection_suggestion: {
    icon: Link2,
    badge: "Connection",
    variant: "secondary" as const,
  },
  isolated_skill: {
    icon: AlertCircle,
    badge: "Isolated",
    variant: "outline" as const,
  },
  trending_skill: {
    icon: TrendingUp,
    badge: "Trending",
    variant: "default" as const,
  },
} as const;

export default function AiInsightsPanel() {
  const { data, isLoading } = useQuery(trpc.skills.insights.queryOptions());

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <Sparkles className="size-3 inline mr-1.5" />
          AI Insights
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card size="sm" key={i}>
              <CardContent>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const insights = data?.insights ?? [];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        <Sparkles className="size-3 inline mr-1.5" />
        AI Insights
      </p>

      {insights.length === 0 ? (
        <Card size="sm">
          <CardContent className="text-xs text-muted-foreground py-3">
            Keep building your graph to unlock insights.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, i) => {
            const config = typeConfig[insight.type];
            const Icon = config.icon;

            return (
              <Card size="sm" key={i}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs font-medium">{insight.title}</span>
                    <Badge variant={config.variant} className="ml-auto shrink-0 text-[10px]">
                      {config.badge}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
