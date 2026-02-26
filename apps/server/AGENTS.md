# AGENTS.md

This package is the Hono backend for better-skills. It hosts Better Auth and tRPC endpoints used by the web app and CLI.

## Local defaults

- Run from repo root with `bun run dev:server`.
- Keep transport concerns here (routing, middleware, adapters); keep domain procedures in `packages/api`.
- Preserve endpoint boundaries: `/api/auth/*` for Better Auth and `/trpc/*` for tRPC.
- Preserve credentialed CORS behavior when changing auth or origin logic.
- Use `@better-skills/env/server` for runtime config validation instead of ad-hoc `process.env` reads.
- Use `bun run compile` in this workspace only when you need the Bun single-binary output.

## Validation

- `bun run check-types`
- `bun run check`

## Additional guidance

- `docs/mention-link-sync-flow.md`
- `.agents/skills/hono/SKILL.md`
- `.agents/skills/better-auth-best-practices/SKILL.md`
