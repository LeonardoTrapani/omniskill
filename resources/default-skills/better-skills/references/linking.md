# Mention Linking

Mention tokens are the way skills reference other resources and skills.
This reference covers all forms and when to use each.

## Draft mentions (create and edit)

Use when adding a new resource file to a skill folder:

```
[[resource:new:references/guide.md]]
[[resource:new:scripts/setup.ts]]
[[resource:new:assets/template.html]]
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
[[resource:<uuid>]]
[[skill:<uuid>]]
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

## Rules

1. Never use bare markdown links (`[text](references/foo.md)`) for
   internal resource references. Always use mention tokens.
2. One mention per resource file, minimum. No resource should exist
   without a matching mention.
3. `better-skills validate` catches missing mentions — run it before
   every create or update.
