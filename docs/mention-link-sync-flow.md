# Markdown Mentions and Link Sync Flow

This doc explains the end-to-end flow for markdown mention parsing, mention validation,
and graph link synchronization in better-skills.

It covers:

- where each part lives
- the single write-path for auto links
- how create/update/duplicate/default-sync interact with mentions
- current invariants and known gaps

## Mention Syntax

### Persisted mentions (graph-connected)

- `[[skill:<uuid>]]`
- `[[resource:<uuid>]]`

These are the canonical storage format in `skill.skill_markdown` and resource `content`.

### Draft-local mentions (path based)

- `[[resource:new:path/to/file]]`

This is used while authoring local skill files. It is resolved to UUID mentions
when resources are created and IDs are known.

### Escaped mentions

- `\[[skill:...]]`
- `\[[resource:...]]`

Escaped tokens are treated as literal text and never become links.

## Package Responsibilities

### `packages/markdown`

Shared markdown-safe primitives:

- `new-resource-mentions` handles `:new:` path collection/normalization/resolution.
- `persisted-mentions` handles UUID mention parse/remap/invalid-token detection.
- `mention-hrefs` centralizes mention URL query + href builders.
- `render-persisted-mentions` renders stored mention tokens to plain labels (download)
  or linked markdown (frontend).
- Mention regexes use `(?<!\\)` negative lookbehind to skip backslash-escaped tokens.

### `packages/api`

Source of truth for persisted mention parsing and link writing:

- `src/lib/mentions.ts`: re-exported shared persisted mention helpers.
- `src/lib/link-sync.ts`: validate targets and write auto links.
- `src/lib/render-mentions.ts`: DB lookup + call shared markdown renderer.

### `apps/web`

Editor and UI mention URL handling:

- `mention-markdown.ts` converts between rendered links and storage mention tokens,
  using shared mention query parsing and href builders.
- markdown render components route mention links to skill/resource pages.

### `apps/cli`

Draft mention workflow for local folder authoring:

- uses `@better-skills/markdown/new-resource-mentions` to resolve `:new:` paths before/after save.

### `packages/auth` (default skill seeding/sync)

- seeds/syncs default templates and resolves `:new:` mentions in top-level `SKILL.md`.

## Single Write Path for Auto Links

All auto-generated `skill_link` writes are centralized in:

- `packages/api/src/lib/link-sync.ts`
  - `syncAutoLinksForSource` (internal)
  - `syncAutoLinksForSources` (public batched entrypoint)

`syncAutoLinks` remains as a compatibility wrapper for skill markdown-only callers,
but delegates into `syncAutoLinksForSources`.

## Write Flow (Create / Update / Duplicate)

### 1) Input validation

Before persisting markdown text:

- validate mention token syntax (UUID-only for persisted mentions)
- validate target existence and same-owner constraints

Validation runs for:

- skill markdown
- each resource markdown content being created/updated

### 2) Persist skill/resource rows

- insert/update/delete skill and resource rows in DB

### 3) Rebuild auto links from current markdown

Router builds a list of changed sources:

- skill source when skill markdown changed
- resource sources for newly inserted and updated resources

Then one call:

- `syncAutoLinksForSources(changedSources, userId)`

For each source:

1. parse mentions from markdown
2. validate same-owner targets
3. delete existing auto links for that source where `metadata.origin = "markdown-auto"`
4. insert new auto links (if mentions exist)

Manual links are untouched.

## Read Flow (Get + Render)

On reads (`skills.getById` / `skills.getBySlug`):

1. API returns both:
   - `originalMarkdown` (canonical mention token form)
   - `renderedMarkdown` (labels/links for UX)
2. `renderMentions` resolves mention IDs to names/paths.
3. Web markdown renderer maps mention URLs to internal skill/resource routes.

Graph endpoints use `skill_link` rows (plus parent skill->resource edges) to build the graph payload.

## Sequence Overview

```text
web/cli editor
  -> trpc skills.create|update|duplicate
    -> validate mention syntax + ownership
    -> persist skill/resource rows
    -> syncAutoLinksForSources(changedSources)
       -> delete old markdown-auto links per source
       -> insert new markdown-auto links per source
  -> read skill
    -> originalMarkdown + renderedMarkdown
    -> web renders mention links and graph
```

## Default Skill Sync Flow

`bun run sync-default-skills` executes `packages/auth/src/sync-default-skills.ts`.

Current behavior:

- scans template files in `resources/default-skills`
- upserts default skill/resources for each matched user skill
- resolves `:new:` mentions in top-level `SKILL.md`
- resolves `:new:` mentions in markdown resources (`.md`, `.mdx`, `.txt`)
- re-resolves lingering persisted `:new:` mentions before rebuilding links
- rebuilds `markdown-auto` links for each default skill source after seed/sync
  (skill markdown + all persisted resources)
- still rebuilds links when template version is unchanged, so link rows can be
  repaired without forcing a content version bump

Intentional boundary:

- non-markdown resources (scripts/assets) are not `:new:`-resolved by default sync
  to avoid rewriting code/example snippets that contain literal token examples.

## Duplication Status

What is already centralized:

- `:new:` mention utilities are shared in `packages/markdown` and reused by CLI/auth.
- API create/update/duplicate auto-link writes are centralized in
  `packages/api/src/lib/link-sync.ts`.

What is still duplicated (known tech debt):

- Route-shape checks for mention href parsing (e.g. `/vault/skills/` vs
  `/dashboard/skills/`) still live in web, because they are app-router concerns.
- Auto-link write strategies are still split between API and auth default-sync
  entrypoints, even though parsing/render primitives are shared.

## Invariants

- Persisted mention targets must be UUIDs.
- Mention targets must exist and belong to the same owner.
- Auto links are tagged with `metadata.origin = "markdown-auto"`.
- Auto links are replace-on-write per source; manual links remain.
- Parsing currently includes fenced code blocks and inline code; only escaped
  tokens are ignored.
