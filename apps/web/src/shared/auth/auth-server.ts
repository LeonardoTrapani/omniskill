import { createAuthClient } from "better-auth/client";
import { createAuthClientOptions } from "@/shared/auth/auth-options";

export const authServerClient = createAuthClient(createAuthClientOptions());
