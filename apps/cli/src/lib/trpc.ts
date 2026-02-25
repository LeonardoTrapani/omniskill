import type { AppRouter } from "@omniskill/api/routers/index";

import { env } from "@omniskill/env/cli";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import { readSessionSync } from "./session";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.SERVER_URL}/trpc`,
      headers() {
        const session = readSessionSync();
        if (!session) {
          return {};
        }

        if (new Date(session.expiresAt).getTime() <= Date.now()) {
          return {};
        }

        return {
          Authorization: `${session.tokenType} ${session.accessToken}`,
        };
      },
    }),
  ],
});
