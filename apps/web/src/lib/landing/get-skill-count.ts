import "server-only";

import { headers } from "next/headers";
import { env } from "@better-skills/env/web";

export async function getSkillCount() {
  try {
    const cookie = (await headers()).get("cookie");
    if (!cookie) return 0;

    const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/trpc/skills.countByOwner`, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok) return 0;
    const json = (await res.json()) as { result: { data: { count: number } } };
    return json.result.data.count;
  } catch {
    return 0;
  }
}
