# Default Skills

These are the source-of-truth skill folders seeded into every new account.

## Editing rules

- When skill content explains or documents the mention syntax
  (`[[resource:new:...]]`, `[[resource:<uuid>]]`, `[[skill:<uuid>]]`),
  always prefix with a backslash (`\[[resource:new:...]]`) so the CLI
  does not resolve the example during create/update.
- Active mentions that should be resolved keep the normal form:
  `[[resource:new:references/foo.md]]`.
