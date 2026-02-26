# AGENTS.md

better-skills is an agent second brain: authenticated users manage a graph of reusable skills from a CLI and a web app, backed by a Hono API.

## Essentials

- Package manager is Bun workspaces (`bun@1.3.5`); use `bun`, not npm/pnpm/yarn.
- Use root Turbo scripts for cross-workspace tasks.
- Default validation after code changes: `bun run check-types` then `bun run check`.
- No shared test runner is defined yet; add package-local tests when introducing new behavior.
- Never commit secrets or `.env` files.

## Workspace map

- `apps/cli`: command-line interface built with `@clack/prompts`, connected to the server via tRPC.
- `apps/web`: Next.js web console for managing skills, graph links, and account state.
- `apps/server`: Hono host for Better Auth and tRPC endpoints.
- `packages/api`: shared tRPC router and context.
- `packages/auth`: Better Auth configuration and adapter wiring.
- `packages/db`: Drizzle schema and migration workflows for Neon Postgres.
- `packages/env`: typed runtime env contracts for server, web, and CLI.
- `packages/config`: shared TypeScript config.

## Canonical commands

- `bun run dev`, `bun run dev:web`, `bun run dev:server`, `bun run dev:cli`
- `bun cli` (runs the CLI directly without turbo)
- `bun run build`, `bun run check-types`, `bun run check`
- `bun run db:push`, `bun run db:generate`, `bun run db:migrate`, `bun run db:studio`

## Required env shape

- Server env: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`.
- Web env: `NEXT_PUBLIC_SERVER_URL`.
- CLI env: `SERVER_URL` (defaults to `http://localhost:3000`).

## Progressive disclosure

- `apps/web/AGENTS.md`
- `apps/server/AGENTS.md`
- `apps/cli/AGENTS.md`
- `packages/api/AGENTS.md`
- `packages/db/AGENTS.md`
- `resources/default-skills/AGENTS.md`
- `docs/mention-link-sync-flow.md`
- `docs/skills-schema.md`
- `.agents/skills/turborepo/SKILL.md`
- `.agents/skills/hono/SKILL.md`
- `.agents/skills/next-best-practices/SKILL.md`
- `.agents/skills/better-auth-best-practices/SKILL.md`
- `.agents/skills/neon-postgres/SKILL.md`
