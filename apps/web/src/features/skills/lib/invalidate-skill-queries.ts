import { queryClient, trpc } from "@/shared/api/trpc";

export async function invalidateSkillCollectionQueries(skillId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: trpc.skills.listByOwner.queryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: trpc.skills.graph.queryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: skillId
        ? trpc.skills.graphForSkill.queryKey({ skillId })
        : trpc.skills.graphForSkill.queryKey(),
    }),
  ]);
}

export async function invalidateSkillEditQueries(skillId: string) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: trpc.skills.getById.queryKey({ id: skillId }),
    }),
    invalidateSkillCollectionQueries(skillId),
  ]);
}
