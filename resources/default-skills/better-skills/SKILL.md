---
name: better-skills
description: |
  Index and route better-skills vault operations from the CLI.
  Trigger when users ask to manage better-skills or a skill vault
  (create, edit, delete, remove, search, clone, link, sync, backup).
  Do not use when asked to use a skill.
---

# better-skills

Classify what the user is asking, then follow the matching branch exactly.

## 1. Create a new skill

Trigger: user wants to author a skill from scratch, from a URL, or from
session context.

→ Load [[resource:new:references/create-skill.md]] and follow its steps.

## 2. Edit an existing skill

Trigger: user wants to modify, update, or extend a skill already in
the vault.

→ Load [[resource:new:references/edit-skill.md]] and follow its steps.

## 3. List / inspect skills

Trigger: user wants to see what skills exist or inspect one.

Run directly — no reference file needed:

```bash
# list user's skills (optional search filter)
better-skills list [search] [--all] [--limit N]

# inspect a single skill
better-skills get <slug-or-uuid>
```

## 4. Onboard unmanaged local skills

Trigger: user wants to bring local skill folders that are not yet in the
vault into the vault.

→ Load [[resource:new:references/onboard-skills.md]] and follow its steps.

## 5. Delete a skill

Trigger: user wants to remove a skill from the vault.

Run directly — no reference file needed:

```bash
better-skills delete <uuid> [--yes]
```

`--yes` skips confirmation. Required in non-interactive environments.

## 6. Sync / config

Trigger: user wants to sync skills to disk or manage CLI config.

Run directly — no reference file needed:

```bash
better-skills sync
better-skills config
```

## Shared references (load only when a flow tells you to)

- Authoring rules → [[resource:new:references/authoring.md]]
- CLI command syntax → [[resource:new:references/commands.md]]

## Rules

1. Every resource file must have a `[[resource:new:<path>]]` mention — either
   in SKILL.md or in another resource. Run `better-skills validate` and fix
   all warnings before create/update.
2. Never use bare markdown links for internal resource references.
3. Do not load shared references proactively. Each flow specifies when to load
   them as an explicit step.
