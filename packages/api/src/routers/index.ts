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
});
export type AppRouter = typeof appRouter;
