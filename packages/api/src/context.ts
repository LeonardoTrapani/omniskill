import type { Context as HonoContext } from "hono";

import { auth } from "@omniscient/auth";

export type CreateContextOptions = {
  context: HonoContext;
};

type Session = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
} | null;

export async function createContext({ context }: CreateContextOptions) {
  const session = await (
    auth.api as {
      getSession: (input: { headers: Headers }) => Promise<Session>;
    }
  ).getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
