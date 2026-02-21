import { db } from "@omniscient/db";
import * as schema from "@omniscient/db/schema/auth";
import { env } from "@omniscient/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";
import { deviceAuthorization } from "better-auth/plugins/device-authorization";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  plugins: [
    bearer(),
    deviceAuthorization({
      verificationUri: `${env.CORS_ORIGIN}/device`,
      validateClient: async (clientId) => clientId === "omniscient-cli",
    }),
  ],
});
