"use client";

import { useState } from "react";

import SkillGraph from "./_components/skill-graph";
import MyOmniTable from "./_components/my-omni-table";
import DeleteSkillDialog from "./_components/delete-skill-dialog";

export default function Dashboard() {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-6">
      <SkillGraph />

      <MyOmniTable
        onDelete={(skillId, skillName) => setDeleteTarget({ id: skillId, name: skillName })}
      />

      <DeleteSkillDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        skillId={deleteTarget?.id ?? null}
        skillName={deleteTarget?.name ?? null}
      />
    </div>
  );
}
