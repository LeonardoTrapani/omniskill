# Flow: Other CLI Operations

Use this for auth, connectivity, discovery commands, import/delete, sync, and config.

## Read first

- [[skill:new:references/commands/other-commands.md]]

## Steps

1. Preflight if API access is needed:
   - `omniskill health`
   - `omniskill whoami` (or `omniskill login`)
2. Run requested command.
3. Return concise result + any next action.

## Safety defaults

- Keep delete confirmation behavior.
- For advisory tasks, propose before mutation unless user explicitly asked to execute.
