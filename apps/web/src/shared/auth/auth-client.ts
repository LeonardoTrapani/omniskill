import { createAuthClient } from "better-auth/react";
import { createAuthClientOptions } from "@/shared/auth/auth-options";

export const authClient = createAuthClient(createAuthClientOptions());
