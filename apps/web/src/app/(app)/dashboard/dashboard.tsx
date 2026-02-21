"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

import ProfileHeader from "./_components/profile-header";
import SkillGraph from "./_components/skill-graph";
import MyOmniTable from "./_components/my-omni-table";
import DeleteSkillDialog from "./_components/delete-skill-dialog";
import AddSkillModal from "./_components/add-skill-modal";

export default function Dashboard({ session }: { session: typeof authClient.$Infer.Session }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data } = useQuery(trpc.skills.listByOwner.queryOptions({ limit: 50 }));

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-6">
      <ProfileHeader session={session} skillCount={data?.items.length ?? 0} />

      <SkillGraph />

      <MyOmniTable
        onAddSkill={() => setModalOpen(true)}
        onDelete={(skillId, skillName) => setDeleteTarget({ id: skillId, name: skillName })}
      />

      <AddSkillModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <DeleteSkillDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        skillId={deleteTarget?.id ?? null}
        skillName={deleteTarget?.name ?? null}
      />
    </div>
  );
}
