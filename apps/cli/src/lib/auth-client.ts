import { env } from "@omniscient/env/cli";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

export const CLI_DEVICE_CLIENT_ID = "omniscient-cli";

export const authClient = createAuthClient({
  baseURL: env.SERVER_URL,
  plugins: [deviceAuthorizationClient()],
});
