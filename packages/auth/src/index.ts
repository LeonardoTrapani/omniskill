import { db } from "@omniscient/db";
import * as schema from "@omniscient/db/schema/auth";
import { env } from "@omniscient/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";
import { deviceAuthorization } from "better-auth/plugins/device-authorization";

function getTrustedOrigins(origin: string): string[] {
  const origins = new Set<string>([origin]);
  const parsed = new URL(origin);
  const host = parsed.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1";

  if (!isLocalHost && host.includes(".")) {
    const altHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    origins.add(`${parsed.protocol}//${altHost}`);
  }

  return [...origins];
}

const trustedOrigins = getTrustedOrigins(env.CORS_ORIGIN);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
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
