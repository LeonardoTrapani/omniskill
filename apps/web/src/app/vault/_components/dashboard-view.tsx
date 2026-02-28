"use client";

import { useEffect, useRef, useState } from "react";
import { Hexagon, Warehouse } from "lucide-react";

import DeleteSkillDialog from "@/app/vault/_components/delete-skill-dialog";
import { GridBackground } from "@/components/ui/grid-background";
import MySkillsTable from "@/app/vault/_components/my-skills-table";
import SkillGraph from "@/app/vault/_components/skill-graph";
import { cn } from "@/lib/utils";

export default function DashboardView() {
  const [mobileTab, setMobileTab] = useState<"graph" | "vault">("graph");
  const [panelHeight, setPanelHeight] = useState(620);
  const [backgroundHeight, setBackgroundHeight] = useState(680);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const panelsGridRef = useRef<HTMLDivElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const updatePanelHeight = () => {
      const isDesktop = window.innerWidth >= 1280;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

      const dashboardTop = dashboardRef.current?.getBoundingClientRect().top ?? 0;
      const panelsTop = panelsGridRef.current?.getBoundingClientRect().top ?? 0;
      const bottomPadding = isDesktop ? 20 : 12;
      const minHeight = isDesktop ? 520 : 360;
      const nextHeight = Math.floor(viewportHeight - panelsTop - bottomPadding);
      const nextBackgroundHeight = Math.floor(viewportHeight - dashboardTop);

      setPanelHeight(Math.max(minHeight, nextHeight));
      setBackgroundHeight(Math.max(240, nextBackgroundHeight));
    };

    const frameId = window.requestAnimationFrame(updatePanelHeight);
    window.addEventListener("resize", updatePanelHeight);
    window.visualViewport?.addEventListener("resize", updatePanelHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePanelHeight);
      window.visualViewport?.removeEventListener("resize", updatePanelHeight);
    };
  }, []);

  return (
    <div ref={dashboardRef} className="relative overflow-hidden">
      <GridBackground className="opacity-32" />

      <div
        className="absolute inset-0 hidden lg:block"
        style={{ height: backgroundHeight }}
        aria-hidden
      >
        <SkillGraph height={backgroundHeight} variant="background" />
      </div>

      {/* Top tab bar – mobile only */}
      <div
        className="relative z-20 flex border-b border-border bg-background/90 backdrop-blur-sm lg:hidden"
        role="tablist"
        aria-label="Dashboard content tabs"
      >
        <button
          type="button"
          id="dashboard-content-tab-graph"
          role="tab"
          aria-controls="dashboard-content-panel-graph"
          aria-selected={mobileTab === "graph"}
          tabIndex={mobileTab === "graph" ? 0 : -1}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
            mobileTab === "graph"
              ? "text-foreground border-b-2 border-primary -mb-[1px]"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setMobileTab("graph")}
        >
          <Hexagon className="size-3" aria-hidden="true" />
          Graph
        </button>
        <button
          type="button"
          id="dashboard-content-tab-vault"
          role="tab"
          aria-controls="dashboard-content-panel-vault"
          aria-selected={mobileTab === "vault"}
          tabIndex={mobileTab === "vault" ? 0 : -1}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
            mobileTab === "vault"
              ? "text-foreground border-b-2 border-primary -mb-[1px]"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setMobileTab("vault")}
        >
          <Warehouse className="size-3" aria-hidden="true" />
          My Vault
        </button>
      </div>

      <div className="relative z-10 mx-auto space-y-6 lg:pr-6 lg:pointer-events-none">
        <div ref={panelsGridRef} className="relative">
          <div className="lg:hidden space-y-6 lg:pointer-events-auto">
            <div
              id="dashboard-content-panel-graph"
              role="tabpanel"
              aria-labelledby="dashboard-content-tab-graph"
              hidden={mobileTab !== "graph"}
              className={mobileTab === "graph" ? "" : "hidden"}
            >
              <SkillGraph height={panelHeight} />
            </div>

            <div
              id="dashboard-content-panel-vault"
              role="tabpanel"
              aria-labelledby="dashboard-content-tab-vault"
              hidden={mobileTab !== "vault"}
              className={mobileTab === "vault" ? "" : "hidden"}
            >
              <MySkillsTable
                height={panelHeight}
                onDelete={(skillId, skillName) => setDeleteTarget({ id: skillId, name: skillName })}
              />
            </div>
          </div>

          <div className="hidden lg:block" style={{ height: backgroundHeight }}>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pl-6">
              <div className="pointer-events-auto h-[75svh] w-[min(380px,calc(100vw-3rem))]">
                <MySkillsTable
                  className="h-full shadow-[0_20px_45px_color-mix(in_oklab,var(--background)_45%,transparent)]"
                  onDelete={(skillId, skillName) =>
                    setDeleteTarget({ id: skillId, name: skillName })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteSkillDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        skillId={deleteTarget?.id ?? null}
        skillName={deleteTarget?.name ?? null}
      />
    </div>
  );
}
