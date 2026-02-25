"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import type { SelectedSkill } from "@/app/(app)/dashboard/_hooks/use-modal-machine";

interface UseAddSkillFlowOptions {
  loginNext: string;
}

interface AddableSkill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export function useAddSkillFlow({ loginNext }: UseAddSkillFlowOptions) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [selectedSkill, setSelectedSkill] = useState<SelectedSkill | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openAddSkillFlow = (skill: AddableSkill) => {
    if (!session?.user) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}` as Route);
      return;
    }

    setSelectedSkill({
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      description: skill.description ?? "",
    });
    setModalOpen(true);
  };

  const closeAddSkillFlow = () => {
    setModalOpen(false);
    setSelectedSkill(null);
  };

  return {
    session,
    selectedSkill,
    modalOpen,
    openAddSkillFlow,
    closeAddSkillFlow,
  };
}
