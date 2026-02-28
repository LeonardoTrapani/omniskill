import { Loader2, Network } from "lucide-react";

import {
  ForceGraph,
  type GraphData,
  type OnNodeClick,
} from "@/components/skills/graph/force-graph";
import { GraphFill } from "@/components/skills/graph-fill";
import { GridBackground } from "@/components/ui/grid-background";
import { SkillPanel } from "@/components/skills/skill-panel";

function SkillGraphPanelContent({
  data,
  isLoading,
  isError,
  focusNodeId,
  mobile,
  onNodeClick,
}: {
  data?: GraphData;
  isLoading: boolean;
  isError: boolean;
  focusNodeId: string;
  mobile: boolean;
  onNodeClick?: OnNodeClick;
}) {
  if (isLoading) {
    return (
      <div className={`flex ${mobile ? "h-[320px]" : "h-full"} items-center justify-center`}>
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex ${mobile ? "h-[320px]" : "h-full"} items-center justify-center`}>
        <p className="text-xs text-muted-foreground">Failed to load graph</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return mobile ? (
    <div className="relative overflow-hidden">
      <GridBackground className="opacity-32" />
      <ForceGraph data={data} focusNodeId={focusNodeId} height={360} onNodeClick={onNodeClick} />
    </div>
  ) : (
    <>
      <GridBackground className="opacity-32" />
      <GraphFill data={data} focusNodeId={focusNodeId} onNodeClick={onNodeClick} />
    </>
  );
}

export function MobileSkillGraphPanel({
  data,
  isLoading,
  isError,
  focusNodeId,
  onNodeClick,
}: {
  data?: GraphData;
  isLoading: boolean;
  isError: boolean;
  focusNodeId: string;
  onNodeClick?: OnNodeClick;
}) {
  return (
    <div className="lg:hidden">
      <SkillPanel
        icon={<Network className="size-3.5 text-muted-foreground" aria-hidden="true" />}
        title="Skill Graph"
        collapsible
        defaultOpen={false}
      >
        <SkillGraphPanelContent
          data={data}
          isLoading={isLoading}
          isError={isError}
          focusNodeId={focusNodeId}
          mobile
          onNodeClick={onNodeClick}
        />
      </SkillPanel>
    </div>
  );
}

export function DesktopSkillGraphPanel({
  data,
  isLoading,
  isError,
  focusNodeId,
  onNodeClick,
  showTitle = true,
}: {
  data?: GraphData;
  isLoading: boolean;
  isError: boolean;
  focusNodeId: string;
  onNodeClick?: OnNodeClick;
  showTitle?: boolean;
}) {
  const graphContent = (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <SkillGraphPanelContent
        data={data}
        isLoading={isLoading}
        isError={isError}
        focusNodeId={focusNodeId}
        mobile={false}
        onNodeClick={onNodeClick}
      />
    </div>
  );

  if (!showTitle) {
    return (
      <div className="flex h-full min-h-0 flex-col border border-border bg-background/90 backdrop-blur-sm md:border-none">
        {graphContent}
      </div>
    );
  }

  return (
    <SkillPanel
      icon={<Network className="size-3.5 text-muted-foreground" aria-hidden="true" />}
      title="Skill Graph"
      className="flex h-full min-h-0 flex-col md:border-none"
    >
      {graphContent}
    </SkillPanel>
  );
}
