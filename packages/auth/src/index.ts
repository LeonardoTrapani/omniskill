import { db } from "@better-skills/db";
import * as schema from "@better-skills/db/schema/auth";
import { env } from "@better-skills/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";
import { deviceAuthorization } from "better-auth/plugins/device-authorization";

import { seedDefaultSkillsForUser } from "./default-skills";

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1";
}

function normalizeHost(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : host;
}

function getTrustedOrigins(...origins: string[]): string[] {
  const trustedOrigins = new Set<string>();

  for (const origin of origins) {
    trustedOrigins.add(origin);

    const parsed = new URL(origin);
    const host = parsed.hostname;

    if (!isLocalHost(host) && host.includes(".")) {
      const altHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
      trustedOrigins.add(`${parsed.protocol}//${altHost}`);
    }
  }

  return [...trustedOrigins];
}

function getCrossSubDomainCookieDomain(origin: string): string | null {
  const host = normalizeHost(new URL(origin).hostname);

  if (isLocalHost(host) || !host.includes(".")) {
    return null;
  }

  return host;
}

const trustedOrigins = getTrustedOrigins(env.CORS_ORIGIN, env.BETTER_AUTH_URL);
const crossSubDomainCookieDomain = getCrossSubDomainCookieDomain(env.CORS_ORIGIN);

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
  user: {
    additionalFields: {
      onboardingCompleted: {
        type: "boolean",
        input: false,
      },
    },
    deleteUser: {
      enabled: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          try {
            const seeded = await seedDefaultSkillsForUser(createdUser.id);

            if (seeded.failed > 0) {
              console.error(
                `[default-skills] seeded ${seeded.created}, skipped ${seeded.skipped}, failed ${seeded.failed} for user ${createdUser.id}`,
              );
            }
          } catch (error) {
            console.error(
              `[default-skills] failed to seed default skills for user ${createdUser.id}`,
              error,
            );
          }
        },
      },
    },
  },
  advanced: {
    ...(crossSubDomainCookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: crossSubDomainCookieDomain,
          },
        }
      : {}),
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
      validateClient: async (clientId) => clientId === "better-skills-cli",
    }),
  ],
});
