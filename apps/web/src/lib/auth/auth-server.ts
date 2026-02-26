import { createAuthClient } from "better-auth/client";
import { createAuthClientOptions } from "@/lib/auth/auth-options";

export const authServerClient = createAuthClient(createAuthClientOptions());
