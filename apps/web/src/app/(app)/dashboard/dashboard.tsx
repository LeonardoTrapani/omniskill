"use client";

import { useEffect, useRef, useState } from "react";

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

      if (isDesktop) {
        const verticalOffset = 170;
        const minHeight = 520;
        setPanelHeight(Math.max(minHeight, Math.floor(viewportHeight - verticalOffset)));
        return;
      }

      const panelsTop = panelsGridRef.current?.getBoundingClientRect().top ?? 0;
      const bottomPadding = 12;
      const minHeight = 360;
      const mobileHeight = Math.floor(viewportHeight - panelsTop - bottomPadding);

      setPanelHeight(Math.max(minHeight, mobileHeight));
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
    <div className="pt-12 pb-0 px-6 md:px-16 space-y-6">
      <div
        className="max-w-[1280px] mx-auto mb-0 grid grid-cols-2 border-x border-t border-border xl:hidden"
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
          onClick={() => setMobileTab("graph")}
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
          onClick={() => setMobileTab("vault")}
        >
          My Vault
        </button>
      </div>

      <div
        ref={panelsGridRef}
        className="max-w-[1280px] mx-auto grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start"
      >
        <div
          id="dashboard-content-panel-graph"
          role="tabpanel"
          aria-labelledby="dashboard-content-tab-graph"
          className={mobileTab === "graph" ? "" : "hidden xl:block"}
        >
          <SkillGraph height={panelHeight} />
        </div>

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

      <DeleteSkillDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        skillId={deleteTarget?.id ?? null}
        skillName={deleteTarget?.name ?? null}
      />
    </div>
  );
}
