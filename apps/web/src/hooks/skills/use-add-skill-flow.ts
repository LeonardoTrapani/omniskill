"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { SelectedSkill } from "@/hooks/skills/use-modal-machine";
import { buildLoginHref } from "@/lib/skills/routes";
import { authClient } from "@/lib/auth/auth-client";

interface UseAddSkillFlowOptions {
  loginNext: string;
}

interface AddableSkill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  resources?: { length: number } | unknown[];
}

export function useAddSkillFlow({ loginNext }: UseAddSkillFlowOptions) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [selectedSkill, setSelectedSkill] = useState<SelectedSkill | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openAddSkillFlow = (skill: AddableSkill) => {
    if (!session?.user) {
      router.push(buildLoginHref(loginNext));
      return;
    }

    const resourceCount = Array.isArray(skill.resources) ? skill.resources.length : 0;

    setSelectedSkill({
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      description: skill.description ?? "",
      resourceCount,
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
