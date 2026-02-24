"use client";

import { useEffect, useRef, useState } from "react";
import PageHeroCard from "@/components/page-hero-card";

import DeleteSkillDialog from "./_components/delete-skill-dialog";
import MyOmniTable from "./_components/my-omni-table";
import SkillGraph from "./_components/skill-graph";

export default function Dashboard() {
  const [mobileTab, setMobileTab] = useState<"graph" | "vault">("graph");
  const [panelHeight, setPanelHeight] = useState(620);
  const panelsGridRef = useRef<HTMLDivElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const updatePanelHeight = () => {
      const isDesktop = window.innerWidth >= 1280;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

      const panelsTop = panelsGridRef.current?.getBoundingClientRect().top ?? 0;
      const bottomPadding = isDesktop ? 20 : 12;
      const minHeight = isDesktop ? 520 : 360;
      const nextHeight = Math.floor(viewportHeight - panelsTop - bottomPadding);

      setPanelHeight(Math.max(minHeight, nextHeight));
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
    <div className="relative overflow-hidden px-6 pb-2 pt-12 md:px-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-30" />

      <div className="relative max-w-[1280px] mx-auto space-y-6">
        {/*<PageHeroCard
          eyebrow="Workspace"
          title="Skill Graph & Vault"
          description="Explore your connected skills and manage your private vault in a single, synchronized workspace."
        />*/}

        <div
          className="mb-0 grid grid-cols-2 border-x border-t border-border bg-background/80 xl:hidden"
          role="tablist"
          aria-label="Dashboard content tabs"
        >
          <button
            type="button"
            id="dashboard-content-tab-graph"
            role="tab"
            aria-controls="dashboard-content-panel-graph"
            aria-selected={mobileTab === "graph"}
            className={`h-11 w-full border-r border-border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
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
            className={`h-11 w-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              mobileTab === "vault"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleMobileTabChange("vault")}
          >
            My Vault
          </button>
        </div>

        <div
          ref={panelsGridRef}
          className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-stretch"
        >
          <div
            id="dashboard-content-panel-graph"
            role="tabpanel"
            aria-labelledby="dashboard-content-tab-graph"
            className={mobileTab === "graph" ? "" : "hidden xl:block"}
          >
            <SkillGraph height={panelHeight} />
          </div>

          <div className={mobileTab === "graph" ? "hidden xl:block" : ""}>
            <div
              id="dashboard-content-panel-vault"
              role="tabpanel"
              aria-labelledby="dashboard-content-tab-vault"
              className={mobileTab === "vault" ? "" : "hidden xl:block"}
            >
              <MyOmniTable
                height={panelHeight}
                onDelete={(skillId, skillName) => setDeleteTarget({ id: skillId, name: skillName })}
              />
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
