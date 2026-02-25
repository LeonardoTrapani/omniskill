import type { Context as HonoContext } from "hono";

import { auth } from "@omniskill/auth";

export type CreateContextOptions = {
  context: HonoContext;
};

type Session = typeof auth.$Infer.Session;

export async function createContext({ context }: CreateContextOptions) {
  const session = (await auth.api.getSession({
    headers: context.req.raw.headers,
  })) as Session;

  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
