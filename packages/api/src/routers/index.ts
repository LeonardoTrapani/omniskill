import { protectedProcedure, publicProcedure, router } from "../trpc";
import { skillsRouter } from "./skills";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  skills: skillsRouter,
});
export type AppRouter = typeof appRouter;
