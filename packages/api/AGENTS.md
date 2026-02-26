# AGENTS.md

This package owns the shared tRPC router and domain behavior for skills, mentions, and graph links.

## Local defaults

- Keep transport and auth adapter concerns out of this package; keep them in `apps/server`.
- Keep markdown mention parsing and link sync behavior centralized in `src/lib` helpers.
- Use `syncAutoLinksForSources` as the single write path for auto-generated mention links.
- Preserve same-owner mention validation rules when changing create/update/duplicate flows.

## Validation

- `bun run check-types`
- `bun run check`

## Additional guidance

- `docs/mention-link-sync-flow.md`
- `docs/skills-schema.md`
