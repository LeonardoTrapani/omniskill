"use client";

import { useEffect, useRef, useState } from "react";

import DeleteSkillDialog from "@/app/vault/_components/delete-skill-dialog";
import MySkillsTable from "@/app/vault/_components/my-skills-table";
import SkillGraph from "@/app/vault/_components/skill-graph";

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

  const handleMobileTabChange = (tab: "graph" | "vault") => {
    setMobileTab(tab);
  };

  return (
    <div ref={dashboardRef} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-20" />

      <div
        className="absolute inset-0 hidden lg:block"
        style={{ height: backgroundHeight }}
        aria-hidden
      >
        <SkillGraph height={backgroundHeight} variant="background" />
      </div>

      <div className="relative z-10 mx-auto space-y-6 pb-14 lg:pb-0 lg:pr-6 lg:pointer-events-none">
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

      <div
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-border bg-background/90 backdrop-blur-sm lg:hidden"
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
          className={`h-12 w-full border-r border-border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            mobileTab === "graph"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handleMobileTabChange("graph")}
        >
          Graph
        </button>
        <button
          type="button"
          id="dashboard-content-tab-vault"
          role="tab"
          aria-controls="dashboard-content-panel-vault"
          aria-selected={mobileTab === "vault"}
          tabIndex={mobileTab === "vault" ? 0 : -1}
          className={`h-12 w-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            mobileTab === "vault"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handleMobileTabChange("vault")}
        >
          My Vault
        </button>
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
