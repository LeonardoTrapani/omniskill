import { unstable_cache } from "next/cache";
import { env } from "@omniscient/env/web";

export const getSkillCount = unstable_cache(
  async () => {
    const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/trpc/skills.count`, {
      method: "GET",
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as { result: { data: { count: number } } };
    return json.result.data.count;
  },
  ["skill-count"],
  { revalidate: 300 },
);
