import { createAuthClient } from "better-auth/react";
import { createAuthClientOptions } from "@/lib/auth/auth-options";

export const authClient = createAuthClient(createAuthClientOptions());
