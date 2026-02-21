import type { AppRouter } from "@omniscient/api/routers/index";

import { env } from "@omniscient/env/native";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.SERVER_URL}/trpc`,
    }),
  ],
});
