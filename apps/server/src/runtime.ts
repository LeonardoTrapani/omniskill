import { trpcServer } from "@hono/trpc-server";
import { appRouter, createContext } from "@omniscient/api";
import { auth } from "@omniscient/auth";
import { env } from "@omniscient/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { handleChatRequest } from "./chat.js";

const app = new Hono();

function getAllowedOrigins(origin: string): string[] {
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

const allowedOrigins = getAllowedOrigins(env.CORS_ORIGIN);

app.use(logger());
app.use(
  "/*",
  cors({
    origin: allowedOrigins,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.post("/api/chat", (c) => handleChatRequest(c));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

export default {
  fetch: app.fetch,
  idleTimeout: 120,
};
