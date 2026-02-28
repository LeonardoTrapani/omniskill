# Mention Linking

Mention tokens are the way skills reference other resources and skills.
This reference covers all forms and when to use each.

## Draft mentions (create and edit)

Use when adding a new resource file to a skill folder:

```
\[[resource:new:references/guide.md]]
\[[resource:new:scripts/setup.ts]]
\[[resource:new:assets/template.html]]
```

The path is relative to the skill root. The CLI resolves these to
UUID-based `\[[resource:<uuid>]]` tokens on create/update.

Every file under `references/`, `scripts/`, or `assets/` MUST have a
matching `\[[resource:new:<path>]]` mention somewhere — in SKILL.md or
in another resource file. `better-skills validate` warns about unlinked
files.

## Persisted mentions (after create/update)

Link to an existing resource or skill by UUID:

```
\[[resource:<uuid>]]
\[[skill:<uuid>]]
```

These are what the CLI produces after resolving draft mentions.
Use them directly when referencing resources or skills that already
exist in the vault (e.g. cross-skill links, or referencing another
flow's resource from within a resource file).

## Escaping

Prefix with a backslash to prevent resolution:

```
\[[resource:new:path/to/file]]
\[[resource:<uuid>]]
\[[skill:<uuid>]]
```

Use this when documenting or explaining the mention syntax itself.
The backslash is stripped in rendered output, so readers see the
literal `\[[resource:...]]` form without the escape.

## Cross-skill links

Use `\[[skill:<uuid>]]` to point users toward a related skill. Placement
matters — embed links where the reader actually needs the pointer, not in
a generic "Related Skills" section at the bottom.

Good: inline in the section where the context is relevant.

```
## React Integration

When writing React components that use atoms, also consult
\[[skill:<uuid>]] for render and bundle performance patterns.
```

Bad: a catch-all list at the end of SKILL.md.

```
## Related Skills

- \[[skill:<uuid>]]
- \[[skill:<uuid>]]
```

Links can go in **reference files**, not just SKILL.md. If a reference
covers a subtopic that overlaps with another skill, put the
`\[[skill:<uuid>]]` link there — that way it loads just-in-time when the
agent reads the reference, rather than always consuming context.

## Rules

1. Never use bare markdown links (`[text](references/foo.md)`) or
   plain-text paths (`references/foo.md`) for internal resource
   references. Every occurrence must be a mention token.
2. One mention per resource file, minimum. No resource should exist
   without a matching mention.
3. If a file is referenced in multiple places, use the mention token at
   every location. The CLI deduplicates — multiple mentions of the same
   path are fine.
4. `better-skills validate` catches missing mentions — run it before
   every create or update. It does not detect leftover bare links, so
   check those manually.
