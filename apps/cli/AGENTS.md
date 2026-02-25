# AGENTS.md

This package is Omniskill's command-line interface, built with `@clack/prompts` and connected to the server via tRPC.

## Local defaults

- Run from repo root with `bun cli` (direct) or `bun run dev:cli` (turbo with watch).
- The CLI uses `@clack/prompts` for interactive prompts and `picocolors` for terminal output.
- tRPC client lives in `src/lib/trpc.ts`; it imports the shared `AppRouter` type from `packages/api`.
- Command modules live in `src/commands/`; each exports a single async function.
- Use `@omniskill/env/cli` for runtime config (`SERVER_URL`). Do not hardcode host URLs.
- Keep auth and session behavior aligned with server expectations.

## Validation

- `bun run check-types`
- `bun run check`

## Required env

- `SERVER_URL` (defaults to `http://localhost:3000`)
