import { env } from "@better-skills/env/web";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

export function createAuthClientOptions() {
  return {
    baseURL: env.NEXT_PUBLIC_SERVER_URL,
    plugins: [deviceAuthorizationClient()],
  };
}
