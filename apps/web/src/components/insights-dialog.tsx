"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import StatsCards from "@/app/(app)/dashboard/_components/stats-cards";
import AiInsightsPanel from "@/app/(app)/dashboard/_components/ai-insights-panel";
import ActivityTimeline from "@/app/(app)/dashboard/_components/activity-timeline";

export default function InsightsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Insights & Stats</DialogTitle>
          <DialogDescription>Overview of your skills, connections, and activity.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <StatsCards />
          <AiInsightsPanel />
          <ActivityTimeline />
        </div>
      </DialogContent>
    </Dialog>
  );
}
