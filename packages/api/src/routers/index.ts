import { and, eq, sql } from "drizzle-orm";

import { db } from "@better-skills/db";
import { skill } from "@better-skills/db/schema/skills";

import { protectedProcedure, publicProcedure, router } from "../trpc";
import { skillsRouter } from "./skills";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  me: protectedProcedure.query(({ ctx }) => {
    return {
      user: {
        id: ctx.session.user.id,
        name: ctx.session.user.name,
        email: ctx.session.user.email,
      },
    };
  }),
  skills: skillsRouter,

  hasActivated: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(skill)
      .where(and(eq(skill.ownerUserId, userId), eq(skill.isDefault, false)));

    return { activated: (row?.count ?? 0) > 0 };
  }),
});
export type AppRouter = typeof appRouter;
