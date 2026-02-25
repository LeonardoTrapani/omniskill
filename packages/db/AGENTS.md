# AGENTS.md

This package owns Drizzle schema and migration workflows for Omniscient's Neon Postgres data model.

## Local defaults

- Run DB tasks from repo root: `bun run db:push`, `bun run db:generate`, `bun run db:migrate`, `bun run db:studio`.
- Drizzle tooling reads `DATABASE_URL` from `apps/server/.env`.
- Keep schema and migration updates together in the same change.
- Keep Better Auth table changes compatible with `packages/auth` adapter expectations.
- Keep this package focused on shared schema and DB client exports.

## Validation

- `bun run check-types`
- `bun run check`

## Additional guidance

- `docs/skills-schema.md`
- `.agents/skills/neon-postgres/SKILL.md`
