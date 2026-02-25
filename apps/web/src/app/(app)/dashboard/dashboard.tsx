"use client";

import { useEffect, useRef, useState } from "react";

import DeleteSkillDialog from "./_components/delete-skill-dialog";
import MyOmniTable from "./_components/my-omni-table";
import ChatView from "./_components/modal-views/chat-view";
import SkillGraph from "./_components/skill-graph";

export default function Dashboard() {
  const [mobileTab, setMobileTab] = useState<"graph" | "vault" | "chat">("graph");
  const [sideTab, setSideTab] = useState<"vault" | "chat">("vault");
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
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
      setIsDesktopLayout(isDesktop);

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

  const sidePanelHeight = isDesktopLayout ? Math.max(320, panelHeight - 44) : panelHeight;

  const handleMobileTabChange = (tab: "graph" | "vault" | "chat") => {
    setMobileTab(tab);
    if (tab !== "graph") {
      setSideTab(tab);
    }
  };

  return (
    <div className="pt-12 pb-0 px-6 md:px-16 space-y-6">
      <div
        className="max-w-[1280px] mx-auto mb-0 grid grid-cols-3 border-x border-t border-border xl:hidden"
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
          className={`h-11 w-full border-r border-border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            mobileTab === "vault"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handleMobileTabChange("vault")}
        >
          My Vault
        </button>
        <button
          type="button"
          id="dashboard-content-tab-chat"
          role="tab"
          aria-controls="dashboard-content-panel-chat"
          aria-selected={mobileTab === "chat"}
          className={`h-11 w-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            mobileTab === "chat"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handleMobileTabChange("chat")}
        >
          Chat
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

        <div className={mobileTab === "graph" ? "hidden xl:block" : ""}>
          <div
            className="hidden xl:grid grid-cols-2 border-x border-t border-border"
            role="tablist"
            aria-label="Dashboard side tabs"
          >
            <button
              type="button"
              id="dashboard-side-tab-vault"
              role="tab"
              aria-controls="dashboard-content-panel-vault"
              aria-selected={sideTab === "vault"}
              className={`h-11 w-full border-r border-border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                sideTab === "vault"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setSideTab("vault")}
            >
              My Vault
            </button>
            <button
              type="button"
              id="dashboard-side-tab-chat"
              role="tab"
              aria-controls="dashboard-content-panel-chat"
              aria-selected={sideTab === "chat"}
              className={`h-11 w-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                sideTab === "chat"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setSideTab("chat")}
            >
              Chat
            </button>
          </div>

          <div
            id="dashboard-content-panel-vault"
            role="tabpanel"
            aria-labelledby={
              isDesktopLayout ? "dashboard-side-tab-vault" : "dashboard-content-tab-vault"
            }
            className={`${mobileTab === "vault" ? "" : "hidden"} ${sideTab === "vault" ? "xl:block" : "xl:hidden"}`}
          >
            <MyOmniTable
              height={sidePanelHeight}
              onDelete={(skillId, skillName) => setDeleteTarget({ id: skillId, name: skillName })}
            />
          </div>

          <div
            id="dashboard-content-panel-chat"
            role="tabpanel"
            aria-labelledby={
              isDesktopLayout ? "dashboard-side-tab-chat" : "dashboard-content-tab-chat"
            }
            className={`${mobileTab === "chat" ? "" : "hidden"} ${sideTab === "chat" ? "xl:block" : "xl:hidden"}`}
          >
            <ChatView
              selectedSkill={null}
              height={sidePanelHeight}
              className="border border-border px-4 py-3 md:px-6 md:py-4"
            />
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
