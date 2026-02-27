import { eq } from "drizzle-orm";

import { db } from "@better-skills/db";
import { user } from "@better-skills/db/schema/auth";

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
      .select({ activated: user.onboardingCompleted })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return { activated: row?.activated ?? false };
  }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    await db
      .update(user)
      .set({ onboardingCompleted: true })
      .where(eq(user.id, userId));

    return { activated: true };
  }),
});
export type AppRouter = typeof appRouter;
