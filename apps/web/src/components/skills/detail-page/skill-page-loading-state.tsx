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
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
      <div className={`mx-auto w-full ${maxWidthClass} space-y-8`}>
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-[560px]" />
        </div>
        <Separator />
        {layout === "editor" ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <Skeleton className="h-[600px] w-full" />
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
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
    </main>
  );
}
