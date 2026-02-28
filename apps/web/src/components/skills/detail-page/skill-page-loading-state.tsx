import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type LoadingLayout = "content" | "editor";

export function SkillPageLoadingState({
  maxWidthClass = "max-w-7xl",
  layout = "content",
}: {
  maxWidthClass?: string;
  layout?: LoadingLayout;
}) {
  return (
    <main className="relative min-h-screen bg-background lg:h-[calc(100dvh-52px)] lg:min-h-0 lg:overflow-hidden">
      {/* ── Mobile layout (old simple design) ── */}
      <div className="lg:hidden px-4 py-6 sm:px-6">
        <div className={`mx-auto w-full ${maxWidthClass} space-y-8`}>
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-96" />
            <Skeleton className="h-4 w-[560px]" />
          </div>
          <Separator />
          {layout === "editor" ? (
            <div className="grid gap-8">
              <Skeleton className="h-[600px] w-full" />
              <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          ) : (
            <div className="grid gap-8">
              <div className="space-y-6">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop layout (new 2-column design) ── */}
      <div className="relative hidden h-full lg:flex">
        {/* ── Left sidebar ── */}
        <aside className="w-[280px] xl:w-[320px] shrink-0 border-r border-border flex flex-col">
          {/* Metadata section */}
          <div className="p-5 shrink-0 border-b border-border space-y-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>

          {/* Tab buttons */}
          <div className="flex border-b border-border">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>

          {/* Graph/Resources section (fills remaining vertical space) */}
          <div className="flex-1 min-h-[240px] p-4">
            <Skeleton className="h-full w-full" />
          </div>
        </aside>

        {/* ── Right content (tabbed, scrollable) ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Tab bar */}
          <div className="border-b border-border px-4 h-10 flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 xl:px-12 py-8 space-y-6">
              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>

              {/* Main content */}
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="py-4">
                  <Skeleton className="h-64 w-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>

            {/* Below-fold panels */}
            <div className="border-t border-border">
              <div className="max-w-4xl mx-auto px-8 xl:px-12 py-6">
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
