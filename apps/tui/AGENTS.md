# AGENTS.md

This package is Omniscient's terminal surface and is evolving from a TUI prototype into an authenticated command-first CLI.

## Local defaults

- Run from repo root with `bun run dev:native`.
- Prefer command-oriented flows and scriptable output over purely visual interactions.
- Keep auth and session behavior aligned with server expectations.
- Share API contracts with `packages/api` and `apps/server`; do not fork transport semantics in the CLI.
- Keep endpoint and credential configuration out of code; use shared env/config contracts.

## Validation

- `bun run check-types`
- `bun run check`

## Additional guidance

- `.agents/skills/opentui/SKILL.md`
